const redis = require("redis")
const Web3Wallet = require("web3-wallet");
const { Web3EventStream } = require("web3-stream");
const config = require('./config')
const abi = require('./EthToSmthSwaps.json')

const ethbtcReadableStreams = require('./streams/ethbtc')
const redisWritableStreams = require('./streams/redis')
const LogStream = require('./streams/log')
// const eosbtcStream = require('./eosbtc')

const web3 = Web3Wallet.create(null, config.ethbtc.rpc)
const contract = web3.eth.loadContract(abi, config.ethbtc.contract);
const redisClient = redis.createClient(config.redis.options)

const { swapName, reputationName, pointsIncrease, pointsDecrease, fromBlock } = config.ethbtc

module.exports = () => {
  (ethbtcReadableStreams.SwapCreated({ web3, contract, fromBlock }))
    .pipe(redisWritableStreams.SwapCreated({ redisClient, swapName }))
    .pipe(LogStream())

  (ethbtcReadableStreams.SwapWithdrawn({ web3, contract, fromBlock }))
    .pipe(redisWritableStreams.SwapWithdrawn({ redisClient, reputationName, pointsPerEvent: pointsIncrease }))
    .pipe(LogStream())

  (ethbtcReadableStreams.SwapRefunded({ web3, contract, fromBlock }))
    .pipe(redisWritableStreams.SwapRefunded({ redisClient, reputationName, pointsPerEvent: pointsDecrease }))
    .pipe(LogStream())

  // ...(eosbtcStream()).pipe(redisEosBtc())
}