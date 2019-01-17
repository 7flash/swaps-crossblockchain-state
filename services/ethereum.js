const redis = require("redis")
const Web3Wallet = require("web3-wallet");
const { Web3EventStream } = require("web3-stream");
const config = require('../config')
const abi = require('../blockchains/ethereum/EthToSmthSwaps.json')

const ethereumReadableStreams = require('../blockchains/ethereum')
const redisWritableStreams = require('../reducers/redis/ethereum')
const LogStream = require('../reducers/log')

const web3 = Web3Wallet.create(null, config.ethereum.rpc)
const contract = web3.eth.loadContract(abi, config.ethereum.contract);
const { CreateSwap, Withdraw, Refund } = contract

const redisClient = redis.createClient(config.redis.options)

const { swapName, reputationName, pointsIncrease, pointsDecrease, fromBlock } = config.ethereum

const processCreatedEvent = (event) => {
  (new ethereumReadableStreams.SwapCreated(web3, CreateSwap, fromBlock))
    .pipe(new redisWritableStreams.SwapCreated({ redisClient, swapName }))
    .pipe(new LogStream())
}

const processWithdrawnEvent = (event) => {
  (new ethereumReadableStreams.SwapWithdrawn(web3, Withdraw, fromBlock))
    .pipe(new redisWritableStreams.SwapWithdrawn({ redisClient, swapName, reputationName, reputationMultiplier: pointsIncrease }))
    .pipe(new LogStream())
}

const processRefundedEvent = (event) => {
  (new ethereumReadableStreams.SwapRefunded(web3, Refund, fromBlock))
    .pipe(new redisWritableStreams.SwapRefunded({ redisClient, swapName, reputationName, reputationMultiplier: pointsDecrease }))
    .pipe(new LogStream())
}

(() => {
  processCreatedEvent(CreateSwap)
  processWithdrawnEvent(Withdraw)
  processRefundedEvent(Refund)
})()
