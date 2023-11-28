export interface LeveragePositionEvent {
  blockNumber: number;
  blockTimestamp: number;
  tokenId: number;
  account: string;
  liquidator: string;
  eventType: string;
}

export interface LeverageClosesData {
  leverageCloses: LeveragePositionEvent[];
}

export interface LeverageOpensData {
  leverageOpens: LeveragePositionEvent[];
}

export interface PositionLiquidatedsData {
  positionLiquidateds: LeveragePositionEvent[];
}
