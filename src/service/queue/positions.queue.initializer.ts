import { Injectable, Logger } from '@nestjs/common';
import { Position } from '../../dto/position';
import { chunk } from 'lodash';
import { BigNumber } from 'ethers';
import { delay } from '../../utils/utils';
import { AppTxExecutorService } from '../app-tx-executor.service';
import { PositionRepository } from '../../repository/position.repository';
import { PositionsQueue } from './positions.queue';
import { PositionsQueueProvider } from './positions-queue.provider';
import { ErrorHandler } from '../error.handler';
import { PositionEntity } from '../../repository/entity/position-entity';

@Injectable()
export class PositionsQueueInitializer {
  private readonly positionsQueue: PositionsQueue;

  private readonly maxBatchSizeForRpcBatchRequest;

  private readonly batchWaitTime;

  constructor(
    private readonly logger: Logger,
    private readonly appTxExecutorService: AppTxExecutorService,
    private readonly positionRepository: PositionRepository,
    private readonly errorHandler: ErrorHandler,
    private readonly queueProvider: PositionsQueueProvider,
  ) {
    this.positionsQueue = queueProvider.getQueue();
    this.maxBatchSizeForRpcBatchRequest = +process.env.MAX_BATCH_SIZE_FOR_RPC_BATCH_REQUEST;
    this.batchWaitTime = +process.env.BATCH_WAIT_TIME;
    (async () => {
      await this.initPositionsQueue();
    })();
  }

  private async initPositionsQueue() {
    try {
      const startTime = Date.now();
      this.logger.log('start restoring all open positions ...');

      const allOpenPositionsFromDb = await this.positionRepository.getAll();
      this.logger.log(`${allOpenPositionsFromDb.length} positions loaded from DB ...`);

      this.logger.log('start refreshing liquidation prices for it ...');
      for (const batchTokenIds of chunk(
        allOpenPositionsFromDb.map((p) => p.tokenId),
        this.maxBatchSizeForRpcBatchRequest,
      )) {
        const liqPrices = await this.appTxExecutorService.liquidationPriceBatched(batchTokenIds);
        liqPrices.forEach((r) => {
          this.logger.log(`position ${r.tokenId} has liq price ${r.liquidationPrice}`);
          if (!BigNumber.from(r.liquidationPrice).isZero()) {
            this.positionsQueue.addPosition(new Position(r.tokenId, BigInt(r.liquidationPrice)));
          }
        });
        await delay(this.batchWaitTime);
      }

      this.logger.log('start querying new positions via rpc ...');
      const positionWithLastTokenId = allOpenPositionsFromDb.sort((a, b) => b.tokenId - a.tokenId)[0];
      let fromTokenId = positionWithLastTokenId ? +positionWithLastTokenId.tokenId + 1 : 0;
      const toTokenId = (await this.appTxExecutorService.tokenIdNext()) + 10;
      let toTokenIdForBatchRequest;

      while (fromTokenId < toTokenId) {
        toTokenIdForBatchRequest = fromTokenId + this.maxBatchSizeForRpcBatchRequest;
        const newPositionsBatch = (await this.appTxExecutorService.getPositionDataBatched(fromTokenId, toTokenIdForBatchRequest)).filter(
          (p) => p.liquidationPrice && !p.liquidationPrice.isZero(),
        );
        this.logger.log(`fetched ${newPositionsBatch.length} positions via rpc tokenIds ${newPositionsBatch.map((p) => p.tokenId)}`);
        for (const newPosition of newPositionsBatch) {
          const tokenId = newPosition.tokenId.toNumber();
          await this.positionRepository.save(new PositionEntity(tokenId, newPosition.liquidationPrice.toBigInt()));
          this.positionsQueue.addPosition(new Position(tokenId, newPosition.liquidationPrice.toBigInt()));
        }
        fromTokenId = fromTokenId + this.maxBatchSizeForRpcBatchRequest + 1;
      }

      this.logger.log(`finished restoring all open positions in ${Date.now() - startTime} ms`);
    } catch (error) {
      await this.errorHandler.handleError('Failed to initialize positions', error);
      throw error;
    }
  }
}
