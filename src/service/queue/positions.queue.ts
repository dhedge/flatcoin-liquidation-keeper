import { Position } from '../../dto/position';

export class PositionsQueue {
  public getAllPositions(): Position[] {
    throw new Error('NotImplementedError');
  }

  public addPosition(position: Position) {
    throw new Error('NotImplementedError');
  }

  public removePosition(tokenId: number) {
    throw new Error('NotImplementedError');
  }

  public updatePosition(position: Position) {
    throw new Error('NotImplementedError');
  }

  public getTop(): Position {
    throw new Error('NotImplementedError');
  }

  public getPositionByTokenId(tokenId: number): Position {
    throw new Error('NotImplementedError');
  }

  public getAllPositionsUnknownLiqPrice(): Position[] {
    throw new Error('NotImplementedError');
  }
}
