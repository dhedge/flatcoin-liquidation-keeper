import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PositionEntity } from './entity/position-entity';
import { Repository } from 'typeorm';

@Injectable()
export class PositionRepository {
  constructor(
    @InjectRepository(PositionEntity)
    private repository: Repository<PositionEntity>,
  ) {}

  public async save(position: PositionEntity): Promise<PositionEntity> {
    return this.repository.save(position);
  }

  public async getAll(): Promise<PositionEntity[]> {
    return this.repository.createQueryBuilder().getMany();
  }

  public async updateLiquidationPrice(tokenId: number, liqPrice: bigint): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(PositionEntity)
      .set({ liquidationPrice: liqPrice })
      .where('token_id = :tokenId', { tokenId: tokenId })
      .execute();
  }

  public async delete(tokenId: number) {
    await this.repository.createQueryBuilder().delete().from(PositionEntity).where('token_id = :tokenId', { tokenId: tokenId }).execute();
  }
}
