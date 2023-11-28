import { BigNumber } from 'ethers';

export class LeveragePositionData {
  tokenId: BigNumber;
  entryPrice: BigNumber;
  marginDeposited: BigNumber;
  additionalSize: BigNumber;
  marginAfterSettlement: BigNumber;
  liquidationPrice: BigNumber;
}
