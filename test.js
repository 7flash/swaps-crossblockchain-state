const Web3Wallet = require("web3-wallet");
const config = require('./config')
const abi = require('./EthToSmthSwaps.json')

const web3 = Web3Wallet.create(null, config.ethbtc.rpc)
const contract = web3.eth.loadContract(abi, config.ethbtc.contract);

const e = contract.CreateSwap({}, { fromBlock: 2766266, toBlock: 2773576 })

e.get((err, result) => {
  console.log(err)
})