import { PositionsAvlQueue } from '../../../src/service/queue/positions-avl-queue';
import { Test, TestingModule } from '@nestjs/testing';
import { Position } from '../../../src/dto/position';

describe('PositionsAvlQueue', () => {
  let positionsQueue: PositionsAvlQueue;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [PositionsAvlQueue],
    }).compile();
    positionsQueue = app.get(PositionsAvlQueue);
  });

  it('should return 1 position', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(0);
    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1000));
  });

  it('should return 1 position and 1 position unknown liquidation price', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, null));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(1);
    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1000));
  });

  it('should return 1 position unknown liquidation price', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(1, null));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(1);
    expect(positionsQueue.getAllPositionsUnknownLiqPrice()[0].tokenId).toBe(1);
    expect(positionsQueue.getAllPositions().length).toBe(0);
  });

  it('should remove position in queue', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, BigInt(1002)));
    positionsQueue.addPosition(new Position(3, BigInt(1003)));
    positionsQueue.removePosition(3);

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(0);
    expect(positionsQueue.getAllPositions().length).toBe(2);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1002));
  });

  it('should replace position if exists in queue', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, BigInt(1002)));
    positionsQueue.addPosition(new Position(2, BigInt(1005)));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(0);
    expect(positionsQueue.getAllPositions().length).toBe(2);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1005));
  });

  it('should remove position with unknown liq price', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, BigInt(1002)));
    positionsQueue.addPosition(new Position(3, null));
    positionsQueue.removePosition(3);

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(0);
    expect(positionsQueue.getAllPositions().length).toBe(2);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1002));
  });

  it('should update position in queue', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, BigInt(1002)));
    positionsQueue.addPosition(new Position(3, null));
    positionsQueue.updatePosition(new Position(2, BigInt(998)));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(1);
    expect(positionsQueue.getAllPositions().length).toBe(2);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1000));
  });

  it('should update position with unknown liq price in queue', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, BigInt(1002)));
    positionsQueue.addPosition(new Position(3, null));
    positionsQueue.updatePosition(new Position(2, null));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(2);
    expect(positionsQueue.getAllPositions().length).toBe(1);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(1000));
  });

  it('load many positions and get top', () => {
    positionsQueue.addPosition(new Position(1, BigInt(1000)));
    positionsQueue.addPosition(new Position(2, BigInt(987)));
    positionsQueue.addPosition(new Position(3, BigInt(1005)));
    positionsQueue.addPosition(new Position(4, BigInt(1054)));
    positionsQueue.addPosition(new Position(5, BigInt(10010)));
    positionsQueue.addPosition(new Position(6, BigInt(105)));

    expect(positionsQueue.getAllPositionsUnknownLiqPrice().length).toBe(0);
    expect(positionsQueue.getAllPositions().length).toBe(6);
    expect(positionsQueue.getTop().liqPrice).toBe(BigInt(10010));
  });
});
