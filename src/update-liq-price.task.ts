import { Injectable, Logger } from '@nestjs/common';
import { PositionsQueueProvider } from './service/queue/positions-queue.provider';
import { PositionsQueue } from './service/queue/positions.queue';
import { chunk } from 'lodash';
import { BigNumber } from 'ethers';
import { Position } from './dto/position';
import { delay } from './utils/utils';
import { AppTxExecutorService } from './service/app-tx-executor.service';
import { Cron } from '@nestjs/schedule';
import { PositionRepository } from './repository/position.repository';

@Injectable()
export class UpdateLiqPriceTask {
  private readonly positionsQueue: PositionsQueue;

  private readonly maxBatchSizeForRpcBatchRequest;
  private readonly batchWaitTime;

  constructor(
    private readonly logger: Logger,
    private readonly queueProvider: PositionsQueueProvider,
    private readonly appTxExecutorService: AppTxExecutorService,
    private readonly positionRepository: PositionRepository,
  ) {
    this.positionsQueue = queueProvider.getQueue();
    this.batchWaitTime = +process.env.BATCH_WAIT_TIME;
    this.maxBatchSizeForRpcBatchRequest = +process.env.MAX_BATCH_SIZE_FOR_RPC_BATCH_REQUEST;
  }

  @Cron('0 */15 * * * *')
  async updateLiqPrice() {
    const startTime = Date.now();
    this.logger.log('start updating liquidation prices in queue ...');
    const positions = this.positionsQueue.getAllPositions();
    for (const batchTokenIds of chunk(
      positions.map((p) => p.tokenId),
      this.maxBatchSizeForRpcBatchRequest,
    )) {
      const liqPriceResult = await this.appTxExecutorService.liquidationPriceBatched(batchTokenIds);
      liqPriceResult.forEach((r) => {
        this.logger.log(`position ${r.tokenId} has liq price ${r.liquidationPrice}`);
        if (!BigNumber.from(r.liquidationPrice).isZero()) {
          this.positionsQueue.updatePosition(new Position(r.tokenId, BigInt(r.liquidationPrice)));
          this.positionRepository.updateLiquidationPrice(r.tokenId, BigInt(r.liquidationPrice));
        } else {
          this.positionsQueue.removePosition(r.tokenId);
          this.positionRepository.delete(r.tokenId);
        }
      });
      await delay(this.batchWaitTime);
    }
    this.logger.log(`finished updating liquidation prices in queue in ${Date.now() - startTime}ms`);
  }
}
