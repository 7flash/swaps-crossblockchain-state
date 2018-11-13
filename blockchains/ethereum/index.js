const { Web3EventStream } = require('web3-stream')

class SwapCreated extends Web3EventStream {
  constructor(web3, event, fromBlock) {
    super(web3, event, {}, { fromBlock })
  }
}

class SwapWithdrawn extends Web3EventStream {
  constructor(web3, event, fromBlock) {
    super(web3, event, {}, { fromBlock })
  }
}

class SwapRefunded extends Web3EventStream {
  constructor(web3, event, fromBlock) {
    super(web3, event, {}, { fromBlock })
  }
}

module.exports = {
  SwapCreated, SwapWithdrawn, SwapRefunded
}
