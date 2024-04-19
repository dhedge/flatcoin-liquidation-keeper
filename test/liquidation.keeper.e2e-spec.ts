import { LiquidationKeeper } from '../src/liquidation.keeper';
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { Position } from '../src/dto/position';
import { PositionsQueueProvider } from '../src/service/queue/positions-queue.provider';
import { PositionsAvlQueue } from '../src/service/queue/positions-avl-queue';
import { BigNumber } from 'ethers';
import { CanBeLiquidatedResult } from '../src/service/app-tx-executor.service';

const moduleMocker = new ModuleMocker(global);

describe('LiquidationKeeper', () => {
  let liquidationKeeper: LiquidationKeeper;
  let positionsQueue: PositionsAvlQueue;
  let canBeLiquidatedBatchedSpy;
  let liquidatePositionSpy;

  beforeEach(async () => {
    process.env.MAX_BATCH_SIZE_FOR_RPC_BATCH_REQUEST = '10';
    process.env.ETH_PRICE_UPDATE_INTERVAL = '5';
    process.env.MAX_BATCH_SIZE_FOR_LIQUIDATION_QUEUE = '5';
    process.env.LIQUIDATION_BUFFER_RATIO = '0';
  });

  it('should call liquidate position', async () => {
    const result1: CanBeLiquidatedResult = { tokenId: 1, canBeLiquidated: true };
    await mockData(999, [result1]);
    positionsQueue.addPosition(new Position(1, BigInt(1000)));

    expect(positionsQueue.getAllPositions().length).toBe(1);

    await liquidationKeeper.executeKeeper();

    expect(canBeLiquidatedBatchedSpy).toHaveBeenCalledTimes(1);
    expect(liquidatePositionSpy).toHaveBeenCalledTimes(1);
    expect(positionsQueue.getAllPositions().length).toBe(0);
  });

  it('should not call liquidate position', async () => {
    const result1: CanBeLiquidatedResult = { tokenId: 1, canBeLiquidated: false };
    await mockData(1001, [result1]);
    positionsQueue.addPosition(new Position(1, BigInt(1000)));

    expect(positionsQueue.getAllPositions().length).toBe(1);

    await liquidationKeeper.executeKeeper();

    expect(canBeLiquidatedBatchedSpy).toHaveBeenCalledTimes(0);
    expect(liquidatePositionSpy).toHaveBeenCalledTimes(0);
    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getAllPositions()[0].tokenId).toBe(1);
  });

  it('should call liquidate position with unkown liq price', async () => {
    const result1: CanBeLiquidatedResult = { tokenId: 2, canBeLiquidated: true };
    await mockData(1001, [result1]);
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, null));

    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(1);

    await liquidationKeeper.executeKeeper();

    expect(canBeLiquidatedBatchedSpy).toHaveBeenCalledTimes(1);
    expect(liquidatePositionSpy).toHaveBeenCalledTimes(1);
    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(0);
  });

  it('should not call liquidate position with unkown liq price', async () => {
    const result1: CanBeLiquidatedResult = { tokenId: 2, canBeLiquidated: false };
    await mockData(1001, [result1]);
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, null));

    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(1);

    await liquidationKeeper.executeKeeper();

    expect(canBeLiquidatedBatchedSpy).toHaveBeenCalledTimes(1);
    expect(liquidatePositionSpy).toHaveBeenCalledTimes(0);
    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(1);
  });

  async function mockData(currentEthPrice: number, canBeLiquidated: CanBeLiquidatedResult[]) {
    const app: TestingModule = await Test.createTestingModule({
      providers: [LiquidationKeeper, PositionsQueueProvider, PositionsAvlQueue],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;

          if (mockMetadata.name === 'AppPriceService') {
            return { getPrice: jest.fn().mockResolvedValue(BigNumber.from(currentEthPrice)), getPriceUpdates: jest.fn().mockResolvedValue('price feed') };
          }
          if (mockMetadata.name === 'AppTxExecutorService') {
            canBeLiquidatedBatchedSpy = jest.fn().mockResolvedValue(canBeLiquidated);
            liquidatePositionSpy = jest.fn().mockResolvedValue('0x012');
            return {
              canBeLiquidatedBatched: canBeLiquidatedBatchedSpy,
              liquidatePosition: liquidatePositionSpy,
              getNonce: jest.fn().mockReturnValue(1),
            };
          }
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    liquidationKeeper = app.get(LiquidationKeeper);
    positionsQueue = app.get(PositionsAvlQueue);
  }
});
