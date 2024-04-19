import { Injectable, Logger } from '@nestjs/common';
import { EthersContract, InjectContractProvider } from 'nestjs-ethers';
import { Contract } from 'ethers';
import { LeverageModule } from './contracts/abi/leverage-module';
import { LiquidationModule } from './contracts/abi/liquidation-module';
import { Position } from './dto/position';
import { PositionsQueue } from './service/queue/positions.queue';
import { PositionsQueueProvider } from './service/queue/positions-queue.provider';
import { PositionRepository } from './repository/position.repository';
import { AppTxExecutorService } from './service/app-tx-executor.service';
import { ErrorHandler } from './service/error.handler';
import { PositionEntity } from './repository/entity/position-entity';

@Injectable()
export class ListenerService {
  private readonly positionsQueue: PositionsQueue;

  constructor(
    private readonly logger: Logger,
    @InjectContractProvider()
    private readonly ethersContract: EthersContract,
    private readonly positionRepository: PositionRepository,
    private readonly queueProvider: PositionsQueueProvider,
    private readonly errorHandler: ErrorHandler,
    private readonly txExecutorService: AppTxExecutorService,
  ) {
    this.positionsQueue = queueProvider.getQueue();
    this.listenLeveragePositionEvent();
  }

  listenLeveragePositionEvent(): void {
    const leverageModuleContractAddress = process.env.LEVERAGE_MODULE_CONTRACT_ADDRESS;
    const liquidationModuleContractAddress = process.env.LIQUIDATION_MODULE_CONTRACT_ADDRESS;
    this.logger.log(
      `listening position events for LeverageModule contract ${leverageModuleContractAddress} and LiquidationModule contract ${liquidationModuleContractAddress} ...`,
    );

    const leverageModuleContract: Contract = this.ethersContract.create(leverageModuleContractAddress, LeverageModule);
    const liquidationModuleContract: Contract = this.ethersContract.create(liquidationModuleContractAddress, LiquidationModule);

    this.listenOnLeverageOpenEvents(leverageModuleContract);
    this.listenOnLeverageModifyEvents(leverageModuleContract);
    this.listenOnLeverageCloseEvents(leverageModuleContract);
    this.listenOnPositionLiquidatedEvents(liquidationModuleContract);
  }

  private listenOnLeverageOpenEvents(leverageModuleContract: Contract) {
    this.logger.log('listening on LeverageOpen events...');
    leverageModuleContract.on('LeverageOpen', async (account, tokenId, entryPrice, event) => {
      try {
        this.logger.log(`new LeverageOpen event...`);
        tokenId = tokenId.toNumber();
        const newPosition = new Position(tokenId);
        const newPositionEntity = new PositionEntity(tokenId);
        try {
          const liqPrice = await this.txExecutorService.liquidationPrice(tokenId);
          newPosition.liqPrice = liqPrice.toBigInt();
          newPositionEntity.liquidationPrice = liqPrice.toBigInt();
        } catch (error) {
          this.logger.error(`failed to get liq price for tokenId ${tokenId}`, error);
        }
        this.positionsQueue.addPosition(newPosition);
        await this.positionRepository.save(newPositionEntity);
        this.logger.log(`new position tokenId ${tokenId} added to queue, liq price ${newPosition.liqPrice}`);
      } catch (error) {
        await this.errorHandler.handleError(`failed to process LeverageOpen event txHash ${event.transactionHash}`, error);
      }
    });
  }

  private listenOnLeverageModifyEvents(leverageModuleContract: Contract) {
    this.logger.log('listening on LeverageAdjust events...');
    leverageModuleContract.on('LeverageAdjust', async (tokenId, averagePrice, adjustPrice, event) => {
      try {
        this.logger.log(`new LeverageAdjust event...`);
        tokenId = tokenId.toNumber();
        const positionInQueue = this.positionsQueue.getPositionByTokenId(tokenId);

        try {
          const liqPrice = await this.txExecutorService.liquidationPrice(tokenId);
          positionInQueue.liqPrice = liqPrice.toBigInt();
          await this.positionRepository.updateLiquidationPrice(tokenId, liqPrice.toBigInt());
        } catch (error) {
          this.logger.error(`failed to get liq price for tokenId ${tokenId}`, error);
          await this.positionRepository.updateLiquidationPrice(tokenId, null);
        }
        this.positionsQueue.updatePosition(positionInQueue);
        this.logger.log(`position tokenId ${tokenId} was updated, liq price ${positionInQueue.liqPrice}`);
      } catch (error) {
        await this.errorHandler.handleError(`failed to process LeverageAdjust event txHash ${event.transactionHash}`, error);
      }
    });
  }

  private listenOnLeverageCloseEvents(leverageModuleContract: Contract) {
    this.logger.log('listening on LeverageClose events...');
    leverageModuleContract.on('LeverageClose', async (tokenId, closePrice, positionSummary, event) => {
      try {
        this.logger.log(`new leverageClose event...`);
        tokenId = tokenId.toNumber();
        this.positionsQueue.removePosition(tokenId);
        await this.positionRepository.delete(tokenId);
        this.logger.log(`position tokenId ${tokenId} was removed from queue as closed`);
      } catch (error) {
        await this.errorHandler.handleError(`failed to process leverageClose event txHash ${event.transactionHash}`, error);
      }
    });
  }

  private listenOnPositionLiquidatedEvents(liquidationModuleContract: Contract) {
    this.logger.log('listening on PositionLiquidated events...');
    liquidationModuleContract.on('PositionLiquidated', async (tokenId, liquidator, liquidationFee, closePrice, positionSummary, event) => {
      try {
        this.logger.log(`new PositionLiquidated event...`);
        tokenId = tokenId.toNumber();
        this.positionsQueue.removePosition(tokenId);
        await this.positionRepository.delete(tokenId);
        this.logger.log(`position tokenId ${tokenId} was removed from queue as liquidated`);
      } catch (error) {
        await this.errorHandler.handleError(`failed to process PositionLiquidated event txHash ${event.transactionHash}`, error);
      }
    });
  }
}
