import { Logger, Module } from '@nestjs/common';
import { LoggingModule } from './config/logging.module';
import { LiquidationKeeper } from './liquidation.keeper';
import { AppPriceService } from './service/app-price.service';
import { RepositoryModule } from './config/repository.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PositionsAvlQueue } from './service/queue/positions-avl-queue';
import { PositionsQueueProvider } from './service/queue/positions-queue.provider';
import { UpdateLiqPriceTask } from './update-liq-price.task';
import { ConfigModule } from '@nestjs/config';
import { PositionRepository } from './repository/position.repository';

import { PositionEntity } from './repository/entity/position-entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListenerService } from './listener.service';
import { AppTxExecutorService } from './service/app-tx-executor.service';
import { EthersModule } from 'nestjs-ethers';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { PositionsQueueInitializer } from './service/queue/positions.queue.initializer';
import { ErrorHandler } from './service/error.handler';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    LoggingModule,
    RepositoryModule,
    PrometheusModule.register(),
    TypeOrmModule.forFeature([PositionEntity]),
    EthersModule.forRoot({
      network: {
        name: process.env.BLOCKCHAIN_NETWORK_NAME,
        chainId: +process.env.CHAIN_ID,
      },
      custom: process.env.PROVIDER_HTTPS_URL,
      useDefaultProvider: false,
    }),
  ],
  controllers: [],
  providers: [
    LiquidationKeeper,
    Logger,
    AppPriceService,
    PositionsQueueProvider,
    PositionsAvlQueue,
    PositionsQueueInitializer,
    UpdateLiqPriceTask,
    AppTxExecutorService,
    PositionRepository,
    ListenerService,
    ErrorHandler,
  ],
})
export class AppModule {}
