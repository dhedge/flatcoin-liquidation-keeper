export class Position {
  tokenId: number;
  liqPrice: bigint;

  constructor(tokenId: number, liqPrice?: bigint) {
    this.tokenId = tokenId;
    this.liqPrice = liqPrice;
  }
}
