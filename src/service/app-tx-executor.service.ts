import { Injectable, Logger } from '@nestjs/common';
import { EthersContract, InjectContractProvider, InjectEthersProvider } from 'nestjs-ethers';
import { JsonRpcBatchProvider, JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { AppPriceService } from './app-price.service';
import { LiquidationModule } from '../contracts/abi/liquidation-module';
import { LeverageModule } from '../contracts/abi/leverage-module';
import { Viewer } from '../contracts/abi/viewer';
import { LeveragePositionData } from '../dto/leverage-position-data';
import { ErrorHandler } from './error.handler';

@Injectable()
export class AppTxExecutorService {
  private readonly batchProvider: JsonRpcBatchProvider;
  private readonly signer: Wallet;
  private readonly liquidationModuleContract: Contract;
  private readonly liquidationModuleContractBatch: Contract;
  private readonly leverageModuleContract: Contract;
  private readonly viewerModuleContract: Contract;

  constructor(
    @InjectContractProvider()
    private readonly ethersContract: EthersContract,
    @InjectEthersProvider()
    private readonly provider: JsonRpcProvider,
    private readonly appPriceService: AppPriceService,
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler,
  ) {
    this.batchProvider = new JsonRpcBatchProvider(process.env.PROVIDER_HTTPS_URL);
    this.signer = new Wallet(process.env.SIGNER_WALLET_PK, this.provider);
    this.liquidationModuleContract = new Contract(process.env.LIQUIDATION_MODULE_CONTRACT_ADDRESS, LiquidationModule, this.signer);
    this.liquidationModuleContractBatch = new Contract(process.env.LIQUIDATION_MODULE_CONTRACT_ADDRESS, LiquidationModule, this.batchProvider);
    this.viewerModuleContract = new Contract(process.env.VIEWER_CONTRACT_ADDRESS, Viewer, this.provider);
    this.leverageModuleContract = new Contract(process.env.LEVERAGE_MODULE_CONTRACT_ADDRESS, LeverageModule, this.provider);
  }

  public async liquidatePosition(tokenId: number, priceFeedUpdateData: string[] | null, nonce: number): Promise<string> {
    this.logger.log(`Liquidating position ${tokenId} ...`);
    let estimated = null;
    try {
      estimated = await this.liquidationModuleContract.estimateGas.liquidate(tokenId, priceFeedUpdateData, {
        value: '1',
      });
    } catch (error) {
      const gasEstimateErrorName = this.errorHandler.getGasEstimateErrorName(error);
      const errorMessage = `failed to estimate gas with error name: ${gasEstimateErrorName} for tokenId: ${tokenId}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log(`Tx estimated: ${estimated}`);

    const maxPriorityFeePerGas: any = BigNumber.from(await this.maxPriorityFeePerGasWithRetry(3, 500));

    const tx = await this.liquidationModuleContract.liquidate(tokenId, priceFeedUpdateData, {
      gasLimit: ethers.utils.hexlify(estimated.add(estimated.mul(40).div(100))),
      maxPriorityFeePerGas: ethers.utils.hexlify(maxPriorityFeePerGas),
      value: '1',
      nonce: nonce,
    });
    const receipt = await tx.wait();
    return receipt?.transactionHash;
  }

  public async canBeLiquidatedBatched(tokenIds: number[]): Promise<CanBeLiquidatedResult[]> {
    const batches = [];
    for (let i = 0; i < tokenIds.length; i++) {
      batches.push(this.liquidationModuleContractBatch.canLiquidate(tokenIds[i]));
    }
    const results = await Promise.all(batches);
    const canBeLiquidatedResults: CanBeLiquidatedResult[] = [];

    for (let i = 0; i < tokenIds.length; i++) {
      const result = { tokenId: tokenIds[i], canBeLiquidated: results[i] };
      canBeLiquidatedResults.push(result);
    }
    return canBeLiquidatedResults;
  }

  public async getPositionDataBatched(tokenIdFrom: number, tokenIdTo: number): Promise<LeveragePositionData[]> {
    const result = await this.viewerModuleContract.getPositionData(tokenIdFrom, tokenIdTo);
    return result.map((r) => this.mapLeveragePositionData(r));
  }

  public async liquidationPrice(tokenId: number): Promise<BigNumber> {
    return this.liquidationModuleContract.liquidationPrice(tokenId);
  }

  public async liquidationPriceBatched(tokenIds: number[]): Promise<LiquidationPriceResult[]> {
    const batches = [];

    for (let i = 0; i < tokenIds.length; i++) {
      batches.push(this.liquidationModuleContractBatch.liquidationPrice(tokenIds[i]));
    }

    const results = await Promise.all(batches);

    const prices: LiquidationPriceResult[] = [];

    for (let i = 0; i < tokenIds.length; i++) {
      const result = { tokenId: tokenIds[i], liquidationPrice: results[i] };
      prices.push(result);
    }
    return prices;
  }

  public async tokenIdNext(): Promise<number> {
    return (await this.leverageModuleContract.tokenIdNext()).toNumber();
  }

  public async getNonce(): Promise<number> {
    return await this.signer.getTransactionCount('latest');
  }

  async maxPriorityFeePerGasWithRetry(maxRetries: number, timeoutMillis: number): Promise<BigNumber> {
    return this.retry<any>(() => this.maxPriorityFeePerGas.bind(this)(), maxRetries, timeoutMillis);
  }

  public maxPriorityFeePerGas(): Promise<any> {
    return this.provider.send('eth_maxPriorityFeePerGas', null);
  }

  async retry<T>(func: () => Promise<T>, maxRetries: number, timeoutMillis: number): Promise<T> {
    for (let retries = 0; retries < maxRetries; retries++) {
      try {
        return await func();
      } catch (err) {
        this.logger.error(`Error querying ${func.name} (retries: ${retries}): ${err.message}`);
        // delay before the next retry
        await new Promise((resolve) => setTimeout(resolve, timeoutMillis)); // 1-second delay
      }
    }
    throw new Error(`Max retry attempts reached`);
  }

  private mapLeveragePositionData(result: any): LeveragePositionData {
    const positionData: LeveragePositionData = new LeveragePositionData();
    positionData.tokenId = result.tokenId;
    positionData.liquidationPrice = result.liquidationPrice;
    positionData.entryPrice = result.entryPrice;
    positionData.marginDeposited = result.marginDeposited;
    positionData.additionalSize = result.additionalSize;
    positionData.marginAfterSettlement = result.marginAfterSettlement;
    return positionData;
  }
}

export interface LiquidationPriceResult {
  tokenId: number;
  liquidationPrice: string;
}

export interface CanBeLiquidatedResult {
  tokenId: number;
  canBeLiquidated: boolean;
}
