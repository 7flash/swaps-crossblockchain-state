const { TransactionsStream, SwapsSearchStream } = require('../blockchains/bitcoin')
const { BitcoinRedisStream } = require('../reducers/redis')
const LogStream = require('../reducers/log')

const config = require('../config')
const blockExplorer = require('blockchain.info/blockexplorer').usingNetwork(3)

const { startBlock, blockIntervalInSeconds, swapName, reputationName, reputationMultiplier } = config.bitcoin

const redis = require("redis")
const redisClient = redis.createClient(config.redis.options)

const processSwaps = () => {
  (new TransactionsStream({ startBlock, blockExplorer, blockIntervalInSeconds }))
    .pipe(new SwapsSearchStream(process.env.network))
    .pipe(new BitcoinRedisStream({ redisClient, swapName, reputationName, reputationMultiplier }))
    .pipe(new LogStream())
}

processSwaps()
