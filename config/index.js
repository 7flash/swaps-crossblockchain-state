module.exports = {
  ethereum: {
    rpc: 'https://rinkeby.infura.io/',
    contract: '0x5937f7cDa3670A6fA111Ae83Ab4A39Cfb5b89EC1',
    swapName: 'ethbtc',
    reputationName: 'rating',
    pointsIncrease: 1,
    pointsDecrease: -1,
    fromBlock: 3706748
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
