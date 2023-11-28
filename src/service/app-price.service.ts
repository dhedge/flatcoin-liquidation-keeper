import { Injectable } from '@nestjs/common';
import { EvmPriceServiceConnection } from '@pythnetwork/pyth-evm-js';
import { PriceFeed } from '@pythnetwork/price-service-sdk';
import { BigNumber } from 'ethers';

@Injectable()
export class AppPriceService {
  private readonly connection: EvmPriceServiceConnection;

  constructor() {
    this.connection = new EvmPriceServiceConnection(process.env.PYTH_NETWORK_PRICE_SERVCE_URI);
  }

  async getPriceUpdates(): Promise<string[]> {
    // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-testnet
    const priceIds = [process.env.PYTH_NETWORK_ETH_USD_PRICE_ID];

    // In order to use Pyth prices in your protocol you need to submit the price update data to Pyth contract in your target
    // chain. `getPriceFeedsUpdateData` creates the update data which can be submitted to your contract. Then your contract should
    // call the Pyth Contract with this data.
    return await this.connection.getPriceFeedsUpdateData(priceIds);
  }

  async getPrice(): Promise<BigNumber> {
    const priceIds = [process.env.PYTH_NETWORK_ETH_USD_PRICE_ID];
    const priceFeeds: PriceFeed[] = await this.connection.getLatestPriceFeeds(priceIds);
    return BigNumber.from(priceFeeds[0].getPriceUnchecked().price).mul(BigNumber.from(10).pow(10));
  }
}
