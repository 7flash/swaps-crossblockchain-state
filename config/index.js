module.exports = {
  ethereum: {
    rpc: 'https://rinkeby.infura.io/',
    contract: '0x4356152f044E3a1Ce1A57566b2E0BEe57949c1b2',
    swapName: 'ethbtc',
    reputationName: 'rating',
    pointsIncrease: 1,
    pointsDecrease: -1,
    fromBlock: 3200000
  },
  redis: {
    options: {}
  },
  bitcoin: {
    startBlock: 1442554,
    blockIntervalInSeconds: 600,
    swapName: 'bitcoin',
    reputationName: 'rating',
    reputationMultiplier: 1
  }
}
