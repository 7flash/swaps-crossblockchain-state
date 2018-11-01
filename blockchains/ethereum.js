const Web3Wallet = require("web3-wallet");
const { Web3EventStream } = require("web3-stream");
const redis = require("redis")

const abi = require('../EthToSmthSwaps.json')
const config = require('../config')

const { rpc, contract, swapName, reputationName, pointsIncrease, pointsDecrease, fromBlock } = config.ethbtc

const ethbtcReadableStreams = require('../streams/ethbtc')
const redisWritableStreams = require('../streams/redis')
const LogStream = require('../streams/log')

const web3 = Web3Wallet.create(null, rpc)
const contract = web3.eth.loadContract(abi, contract);
const redisClient = redis.createClient(config.redis.options)

const processCreatedEvent = () => {
  (ethbtcReadableStreams.SwapCreated({ web3, contract, fromBlock }))
    .pipe(redisWritableStreams.SwapCreated({ redisClient, swapName }))
    .pipe(LogStream())
}

const processWithdrawnEvent = () => {
  (ethbtcReadableStreams.SwapWithdrawn({ web3, contract, fromBlock }))
    .pipe(redisWritableStreams.SwapWithdrawn({ redisClient, reputationName, pointsPerEvent: pointsIncrease }))
    .pipe(LogStream())
}

const processRefundedEvent = () => {
  (ethbtcReadableStreams.SwapRefunded({ web3, contract, fromBlock }))
    .pipe(redisWritableStreams.SwapRefunded({ redisClient, reputationName, pointsPerEvent: pointsDecrease }))
    .pipe(LogStream())
}

module.exports = () => {
  processCreatedEvent()
  processWithdrawnEvent()
  processRefundedEvent()
}