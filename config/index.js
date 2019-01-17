module.exports = {
  ethereum: {
    rpc: 'https://rinkeby.infura.io/',
    contract: '0x7C8F2b4D30A98A9Abcdeac3cf49d51f92a6dd81d',
    swapName: 'ethbtc',
    reputationName: 'rating',
    pointsIncrease: 1,
    pointsDecrease: -1,
    fromBlock: 3511487
  },
  redis: {
    options: {}
  },
  bitcoin: {
    startBlock: 1445164,
    blockIntervalInSeconds: 600,
    swapName: 'bitcoin',
    reputationName: 'rating',
    reputationMultiplier: 1
  }
}
