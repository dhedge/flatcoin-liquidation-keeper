import { Injectable } from '@nestjs/common';
import AVLTree from 'avl';
import { PositionsQueue } from './positions.queue';
import { Position } from '../../dto/position';

@Injectable()
export class PositionsAvlQueue extends PositionsQueue {
  private readonly positionsUnknownLiqPrice: Map<number, Position>;
  private readonly positions: AVLTree<string, Position>;
  private readonly tokenIdKeyMap: Map<number, string>;

  constructor() {
    super();
    this.positions = new AVLTree((a, b) => +b - +a);
    this.tokenIdKeyMap = new Map();
    this.positionsUnknownLiqPrice = new Map();
  }

  public getAllPositions(): Position[] {
    return this.positions.values();
  }

  public addPosition(position: Position) {
    if (position.liqPrice) {
      this.positionsUnknownLiqPrice.delete(position.tokenId);
      if (!this.tokenIdKeyMap.get(position.tokenId)) {
        const key = this.generateId(position);
        this.positions.insert(key, position);
        this.tokenIdKeyMap.set(position.tokenId, key);
      } else {
        this.updatePosition(position);
      }
    } else {
      const key = this.tokenIdKeyMap.get(position.tokenId);
      this.positions.remove(key);
      this.tokenIdKeyMap.delete(position.tokenId);
      this.positionsUnknownLiqPrice.set(position.tokenId, position);
    }
  }

  public removePosition(tokenId: number) {
    const key = this.tokenIdKeyMap.get(tokenId);
    this.positions.remove(key);
    this.tokenIdKeyMap.delete(tokenId);
    this.positionsUnknownLiqPrice.delete(tokenId);
  }

  public updatePosition(position: Position) {
    if (position.liqPrice) {
      this.positionsUnknownLiqPrice.delete(position.tokenId);
      this.removePosition(position.tokenId);
      this.addPosition(position);
    } else {
      this.removePosition(position.tokenId);
      this.positionsUnknownLiqPrice.set(position.tokenId, position);
    }
  }

  public getTop(): Position {
    return this.positions.at(0) ? this.positions.at(0).data : null;
  }

  public getAllPositionsUnknownLiqPrice(): Position[] {
    return Array.from(this.positionsUnknownLiqPrice.values());
  }

  public getPositionByTokenId(tokenId: number): Position {
    const key = this.tokenIdKeyMap.get(tokenId);
    let position = this.positions.find(key).data;
    if (!position) {
      position = this.positionsUnknownLiqPrice.get(tokenId);
    }
    return position;
  }

  private generateId(position: Position): string {
    return position.liqPrice.toString() + '.' + position.tokenId.toString();
  }
}
