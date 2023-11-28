import { Injectable } from '@nestjs/common';
import { PositionsQueue } from './positions.queue';
import { PositionsAvlQueue } from './positions-avl-queue';

@Injectable()
export class PositionsQueueProvider {
  private readonly queue: PositionsQueue;

  constructor(private readonly avlQueue: PositionsAvlQueue) {
    this.queue = avlQueue;
  }

  public getQueue(): PositionsQueue {
    return this.queue;
  }
}
