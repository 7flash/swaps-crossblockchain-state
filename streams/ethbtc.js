const { Web3EventStream } = require('web3-stream')

let swapCreatedInstance = null
let swapWithdrawnInstance = null
let swapRefundedInstance = null

module.exports = {
  SwapCreated: ({ web3, contract, fromBlock }) => {
    if (swapCreatedInstance === null)
      swapCreatedInstance = new Web3EventStream(web3, contract.Created, {}, { fromBlock })

    return swapCreatedInstance
  },
  SwapWithdrawn: ({ web3, contract, fromBlock }) => {
    if (swapWithdrawnInstance === null)
      swapWithdrawnInstance = new Web3EventStream(web3, contract.Withdrawn, {}, { fromBlock })

    return swapWithdrawnInstance
  },
  SwapRefunded: ({ web3, contract, fromBlock }) => {
    if (swapRefundedInstance === null)
      swapRefundedInstance = new Web3EventStream(web3, contract.Refunded, {}, { fromBlock })

    return swapRefundedInstance
  }
}