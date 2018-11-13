const { Duplex } = require("stream")
const { promisify } = require("util")

class BitcoinRedisStream extends Duplex {
  constructor({ redisClient, swapName, reputationName, reputationMultiplier }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.swapName = swapName
    this.reputationName = reputationName
    this.reputationMultiplier = reputationMultiplier

    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
    this.incrby = promisify(this.redisClient.INCRBY).bind(this.redisClient)
    this.hget = promisify(this.redisClient.hget).bind(this.redisClient)
    this.rpush = promisify(this.redisClient.rpush).bind(this.redisClient)
  }

  updateIndex(data) {
    return this.hget(`${this.swapName}:${data.secretHash}`, 'secretHash').then((hash) => {
      if (hash)
        throw new Error('existing swap')
    }).then(() => {
      return this.rpush(this.swapName, data.secretHash)
    })
  }

  saveSwap(data) {
    return this.hmset(`${this.swapName}:${data.secretHash}`, data)
  }

  updateReputation(data) {
    const { buyer, seller } = data

    const increaseBuyerReputation = this.incrby(`${this.reputationName}:${buyer}`, 1 * this.reputationMultiplier)
    const increaseSellerReputation = this.incrby(`${this.reputationName}:${seller}`, 1 * this.reputationMultiplier)

    return Promise.all([increaseBuyerReputation, increaseSellerReputation])
  }

  _write(data, encoding, callback) {
    this.updateIndex(data).then(() => {
      return this.saveSwap(data)
    }).then(() => {
      return this.updateReputation(data)
    }).then(() => {
      this.push(data)
      callback()
    }).catch((error) => {
      this.push({ error })
      callback()
    })
  }

  _read() {}
}

module.exports = {
  BitcoinRedisStream
}
