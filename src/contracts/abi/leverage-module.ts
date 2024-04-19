export const LeverageModule = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'closePrice',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'int256',
            name: 'profitLoss',
            type: 'int256',
          },
          {
            internalType: 'int256',
            name: 'accruedFunding',
            type: 'int256',
          },
          {
            internalType: 'int256',
            name: 'marginAfterSettlement',
            type: 'int256',
          },
        ],
        indexed: false,
        internalType: 'struct FlatcoinStructs.PositionSummary',
        name: 'positionSummary',
        type: 'tuple',
      },
    ],
    name: 'LeverageClose',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'entryPrice',
        type: 'uint256',
      },
    ],
    name: 'LeverageOpen',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'averagePrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'adjustPrice',
        type: 'uint256',
      },
    ],
    name: 'LeverageAdjust',
    type: 'event',
  },
  {
    inputs: [],
    name: 'tokenIdNext',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
