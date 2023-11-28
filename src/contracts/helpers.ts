import { utils } from 'ethers';

export const createInterfaceInstance = (abi: unknown): utils.Interface => new utils.Interface(abi as string[]);
