const IPFS = require("ipfs")
const Room = require("ipfs-pubsub-room")
const redis = require("redis")

const config = require('../config')

const { swapName, ipfsOptions, ipfsRoomName, bitcoinCreatedEvent, bitcoinWithdrawnEvent } = config.btceth

const redisClient = redis.createClient(config.redis.options)

const LogStream = require('../streams/log')
const IpfsStream = require('../streams/ipfs')

const ipfsInstance = new IPFS(ipfsOptions)
const ipfsRoom = Room(ipfsInstance, ipfsRoom)

const ipfsParams = {
  room: ipfsRoom,
  events: [bitcoinCreateEvent, bitcoinWithdrawEvent]
}

const processBitcoinTransactions = () => {
  (Ipfs.Messages(ipfsParams))
    .pipe(Ipfs.TransactionDetails())
    .pipe(redisWritableStreams.BitcoinTransaction({ redisClient, swapName: bitcoinSwapName }))
    .pipe(LogStream())
}

module.exports = () => {
  processBitcoinTransactions()
}