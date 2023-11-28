import { BigNumber } from 'ethers';

export const formatTokenBalance = (price: BigNumber, fraction: number): number => {
  const numericValue = parseFloat(price.div(BigNumber.from('1000000000000000000').div(10 ** fraction)).toString()) / 10 ** fraction;
  const formattedValue = numericValue.toFixed(fraction);
  return parseFloat(formattedValue);
};

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
