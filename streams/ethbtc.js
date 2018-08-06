const { Web3EventStream } = require('web3-stream')

let SwapCreated = null
let SwapWithdrawn = null
let SwapRefunded = null

module.exports = {
  SwapCreated: ({ web3, contract, fromBlock }) => {
    if (SwapCreated === null)
      SwapCreated = new Web3EventStream(web3, contract.Created, {}, { fromBlock })

    return SwapCreated
  },
  SwapWithdrawn: ({ web3, contract, fromBlock }) => {
    if (SwapWithdrawn === null)
      SwapWithdrawn = new Web3EventStream(web3, contract.Withdrawn, {}, { fromBlock })

    return SwapWithdrawn
  },
  SwapRefunded: ({ web3, contract, fromBlock }) => {
    if (SwapRefunded === null)
      SwapRefunded = new Web3EventStream(web3, contract.Refunded, {}, { fromBlock })

    return SwapRefunded
  }
}