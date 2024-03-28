import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@nestjs/config';

import { PositionEntity } from '../repository/entity/position-entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_NAME,
      synchronize: true,
      entities: [PositionEntity],
      ///enable sql logging
      logging: false,
    }),
  ],
  providers: [],
})
export class RepositoryModule {}
