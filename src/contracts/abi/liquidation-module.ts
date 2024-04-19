export const LiquidationModule = [
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
        internalType: 'address',
        name: 'liquidator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'liquidationFee',
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
    name: 'PositionLiquidated',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'canLiquidate',
    outputs: [
      {
        internalType: 'bool',
        name: 'liquidatable',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'liquidationPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: 'liqPrice',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const Liquidate = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenID',
        type: 'uint256',
      },
      {
        internalType: 'bytes[]',
        name: 'priceUpdateData',
        type: 'bytes[]',
      },
    ],
    name: 'liquidate',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

export const LiquidateWithoutPriceFeeds = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'liquidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
