import { Injectable, Logger } from '@nestjs/common';
import { EthersContract, InjectContractProvider, InjectEthersProvider } from 'nestjs-ethers';
import { JsonRpcBatchProvider, JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { AppPriceService } from './app-price.service';
import * as LiquidationModule from '../contracts/abi/LiquidationModule.json';
import * as LeverageModule from '../contracts/abi/LeverageModule.json';

import * as Viewer2 from '../contracts/abi/ViewerGetPosData_2.json';
import { LeveragePositionData } from '../dto/leverage-position-data';

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
  ) {
    this.batchProvider = new JsonRpcBatchProvider(process.env.PROVIDER_HTTPS_URL);
    this.signer = new Wallet(process.env.SIGNER_WALLET_PK, this.provider);
    this.liquidationModuleContract = new Contract(process.env.LIQUIDATION_MODULE_CONTRACT_ADDRESS, LiquidationModule, this.signer);
    this.liquidationModuleContractBatch = new Contract(process.env.LIQUIDATION_MODULE_CONTRACT_ADDRESS, LiquidationModule, this.batchProvider);
    this.viewerModuleContract = new Contract(process.env.VIEWER_CONTRACT_ADDRESS, Viewer2, this.provider);
    this.leverageModuleContract = new Contract(process.env.LEVERAGE_MODULE_CONTRACT_ADDRESS, LeverageModule, this.provider);
  }

  public async liquidatePosition(tokenId: number, priceFeedUpdateData: string[] | null): Promise<string> {
    this.logger.log(`Liquidating position ${tokenId} ...`);
    const estimated = await this.liquidationModuleContract.estimateGas.liquidate(tokenId, priceFeedUpdateData, {
      value: '1',
    });

    this.logger.log(`Tx estimated: ${estimated}`);

    const tx = await this.liquidationModuleContract.liquidate(tokenId, priceFeedUpdateData, {
      gasLimit: ethers.utils.hexlify(estimated.add(estimated.mul(40).div(100))),
      gasPrice: ethers.utils.parseUnits('1.5', 'gwei'),
      value: '1',
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
