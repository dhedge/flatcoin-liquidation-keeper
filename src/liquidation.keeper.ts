import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppPriceService } from './service/app-price.service';
import { PositionsQueue } from './service/queue/positions.queue';
import { PositionsQueueProvider } from './service/queue/positions-queue.provider';
import { AppTxExecutorService } from './service/app-tx-executor.service';
import { chunk } from 'lodash';
import { PositionRepository } from './repository/position.repository';
import { Position } from './dto/position';
import { BigNumber } from 'ethers';
import { ETHER_UNIT } from './constants/contstants';
import { delay, formatTokenBalance } from './utils/utils';
import { ErrorHandler } from './service/error.handler';

@Injectable()
export class LiquidationKeeper {
  private readonly positionsQueue: PositionsQueue;
  private readonly liquidationBufferRatio: number;
  private activeKeeperTasks: Record<number, boolean> = {};

  private currentEthPrice: BigNumber;
  private ethPriceUpdateAt = 0;

  private readonly maxBatchSizeForLiquidationQueue;
  private readonly maxBatchSizeForRpcBatchRequest;
  private readonly batchWaitTime;

  private readonly ethPriceRefreshIntervalSec;
  constructor(
    private readonly appPriceService: AppPriceService,
    private readonly logger: Logger,
    private readonly queueProvider: PositionsQueueProvider,
    private readonly appTxExecutorService: AppTxExecutorService,
    private readonly positionRepository: PositionRepository,
    private readonly errorHandler: ErrorHandler,
  ) {
    this.positionsQueue = queueProvider.getQueue();
    this.liquidationBufferRatio = parseFloat(process.env.LIQUIDATION_BUFFER_RATIO);
    this.maxBatchSizeForLiquidationQueue = +process.env.MAX_BATCH_SIZE_FOR_LIQUIDATION_QUEUE;
    this.maxBatchSizeForRpcBatchRequest = +process.env.MAX_BATCH_SIZE_FOR_RPC_BATCH_REQUEST;
    this.batchWaitTime = +process.env.BATCH_WAIT_TIME;
    this.ethPriceRefreshIntervalSec = +process.env.ETH_PRICE_UPDATE_INTERVAL;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async executeKeeper() {
    try {
      const startTime = Date.now();
      const positions = this.positionsQueue.getAllPositions();
      const positionsUnknownLiqPrice = this.positionsQueue.getAllPositionsUnknownLiqPrice();

      if (positionsUnknownLiqPrice.length) {
        this.logger.log(`in queue ${positionsUnknownLiqPrice.length} positionsUnknownLiqPrice`);
        this.logger.log('start checking if can be liquidated positions with unknown liqPrice ... ');
        await this.checkAndLiquidatePositions(positionsUnknownLiqPrice);
      }

      const positionWithTopLiqPrice = this.positionsQueue.getTop();
      if (positionWithTopLiqPrice) {
        await this.updateEthPrice();
        const priceRatioOfTopPosition: number = formatTokenBalance(
          this.currentEthPrice.sub(positionWithTopLiqPrice.liqPrice).mul(ETHER_UNIT).div(this.currentEthPrice),
          4,
        );

        if (this.liquidationBufferRatio > priceRatioOfTopPosition) {
          this.logger.log(
            `in queue ${positions.length}, currentEthPrice ${formatTokenBalance(this.currentEthPrice, 2)}, positionTopLiqPrice ${formatTokenBalance(
              BigNumber.from(positionWithTopLiqPrice.liqPrice),
              2,
            )} liquidationBufferRatio ${this.liquidationBufferRatio},priceRatioOfTopPosition ${priceRatioOfTopPosition}`,
          );
          await this.checkAndLiquidatePositions(this.filterPositions(positions));
          this.logger.log(`liquidation keeper executed in ${Date.now() - startTime} ms `);
        }
      }
    } catch (error) {
      await this.errorHandler.handleError('error in liquidation keeper', error);
    }
  }

  private async checkAndLiquidatePositions(positions: Position[]): Promise<void> {
    for (const batch of chunk(positions, this.maxBatchSizeForRpcBatchRequest)) {
      const canBeLiquidatedBatched = await this.appTxExecutorService.canBeLiquidatedBatched(batch.map((p) => p.tokenId));
      const positionsCanBeLiquidated = canBeLiquidatedBatched.filter((p) => p.canBeLiquidated).map((p) => p.tokenId);
      this.logger.log(`${positionsCanBeLiquidated.length} positions can be liquidated, ids ${positionsCanBeLiquidated} ...`);
      let nonce = await this.appTxExecutorService.getNonce();
      for (const batchPositionsCanBeLiquidated of chunk(positionsCanBeLiquidated, this.maxBatchSizeForLiquidationQueue)) {
        const batches = batchPositionsCanBeLiquidated.map((tokenId) => {
          this.execAsyncKeeperCallback(tokenId, () => this.liquidatePosition(tokenId, nonce));
          nonce++;
        });
        await Promise.all(batches);
        await delay(100);
      }
    }
  }

  private async liquidatePosition(tokenId: number, nonce: number) {
    try {
      const priceFeed = await this.appPriceService.getPriceUpdates();
      const txHash: string = await this.appTxExecutorService.liquidatePosition(tokenId, priceFeed, nonce);
      if (txHash) {
        this.positionsQueue.removePosition(tokenId);
        this.logger.log(`position ${tokenId} was liquidated, txHash ${txHash}`);
      }
    } catch (error) {
      await this.errorHandler.handleError(`error while liquidating position ${tokenId}`, error);
    }
  }

  private async execAsyncKeeperCallback(tokenId: number, cb: () => Promise<void>): Promise<void> {
    if (this.activeKeeperTasks[tokenId]) {
      // Skip task as its already running.
      return;
    }
    this.activeKeeperTasks[tokenId] = true;
    try {
      await cb();
    } catch (err) {
      this.logger.error(`error liquidating position tokenId ${tokenId}\n${err}`);
      this.logger.error((err as Error).stack);
    }
    delete this.activeKeeperTasks[tokenId];
  }

  private async updateEthPrice() {
    try {
      if (Date.now() - this.ethPriceUpdateAt > this.ethPriceRefreshIntervalSec * 1000) {
        this.logger.log('start refreshing current eth price ...');
        this.currentEthPrice = await this.appPriceService.getPrice();
        this.ethPriceUpdateAt = Date.now();
      }
    } catch (error) {
      this.logger.error('failed to update current eth price', error);
    }
  }

  //get all positions with liq price lower 10% then current price
  private filterPositions(positions: Position[]): Position[] {
    return positions.filter((p) => !this.activeKeeperTasks[p.tokenId] && p.liqPrice > this.currentEthPrice.mul(90).div(100).toBigInt());
  }
}
