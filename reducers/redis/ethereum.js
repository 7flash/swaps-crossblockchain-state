const { Duplex } = require("stream")
const { promisify } = require("util")
const crypto = require("crypto")

const promisifyRedis = (redisClient) => ({
  hset: promisify(redisClient.hset).bind(redisClient),
  hmset: promisify(redisClient.hmset).bind(redisClient),
  hget: promisify(redisClient.hget).bind(redisClient),
  rpush: promisify(redisClient.rpush).bind(redisClient),
  incrby: promisify(redisClient.INCRBY).bind(redisClient),
  decrby: promisify(redisClient.DECRBY).bind(redisClient)
})

const stringifyFields = (fields) => {
  return Object.assign({}, ...Object.keys(fields).map((key) => ({
    [key]: typeof fields[key].toString === 'function' ? fields[key].toString() : fields[key]
  })))
}

const removeStartingUnderscore = (fields) => {
  return Object.assign({}, ...Object.keys(fields).map((key) => {
    const keyWithoutUnderscore = key.startsWith('_') ? key.slice(1) : key

    return {
      [keyWithoutUnderscore]: fields[key]
    }
  }))
}

const formattedEvent = (event) => {
  const { args, transactionHash } = event
  return {
    ...removeStartingUnderscore(stringifyFields(args)),
    transactionHash,
  }
}

class SwapRefunded extends Duplex {
  constructor({ redisClient, swapName, reputationName, reputationMultiplier }) {
    super({ objectMode: true })

    this.swapName = swapName
    this.reputationName = reputationName
    this.reputationMultiplier = reputationMultiplier
    this.redis = promisifyRedis(redisClient)
  }

  async save(data) {
    const { transactionHash, secretHash, buyer } = data

    const existingHash = await this.redis.hget(`${this.swapName}:${secretHash}:refund`, 'secretHash')

    if (existingHash)
      throw new Error(`Refund transaction conflict, transaction: ${transactionHash}, secret hash: ${secretHash}`)

    await this.redis.decrby(`${this.reputationName}:${buyer}`, 1 * this.reputationMultiplier)

    await this.redis.hmset(`${this.swapName}:${secretHash}:refund`, data)
  }

  async _write(event, encoding, callback) {
    const data = formattedEvent(event)

    try {
      await this.save(data)
      this.push({ data })
    } catch (error) {
      this.push({ error })
    } finally {
      callback()
    }
  }

  _read() {}
}

class SwapWithdrawn extends Duplex {
  constructor({ redisClient, swapName, reputationName, reputationMultiplier }) {
    super({ objectMode: true })

    this.swapName = swapName
    this.reputationName = reputationName
    this.reputationMultiplier = reputationMultiplier
    this.redis = promisifyRedis(redisClient)
  }

  async save(data) {
    const { transactionHash, secretHash, buyer, seller } = data

    const existingHash = await this.redis.hget(`${this.swapName}:${secretHash}:withdraw`, 'secretHash')

    if (existingHash)
      throw new Error(`Withdraw transaction conflict, transaction: ${transactionHash}, secret hash: ${secretHash}`)

    await this.redis.hmset(`${this.swapName}:${secretHash}:withdraw`, data)

    const increaseBuyerReputation = this.redis.incrby(`${this.reputationName}:${buyer}`, 1 * this.reputationMultiplier)
    const increaseSellerReputation = this.redis.incrby(`${this.reputationName}:${seller}`, 1 * this.reputationMultiplier)

    await Promise.all([increaseBuyerReputation, increaseSellerReputation])
  }

  async _write(event, encoding, callback) {
    const data = formattedEvent(event)

    try {
      await this.save(data)
      this.push({ data })
    } catch (error) {
      this.push({ error })
    } finally {
      callback()
    }
  }

  _read() {}
}

class SwapCreated extends Duplex {
  constructor({ redisClient, swapName }) {
    super({ objectMode: true })

    this.swapName = swapName
    this.redis = promisifyRedis(redisClient)
  }

  async save(data) {
    const { transactionHash, secretHash } = data

    const existingHash = await this.redis.hget(`${this.swapName}:${secretHash}:deposit`, 'secretHash')

    if (!secretHash)
      throw new Error(`Create transaction invalid, secret hash: ${secretHash}`)

    if (existingHash)
      throw new Error(`Create transaction conflict, transaction: ${transactionHash}, secret hash: ${secretHash}`)

    await this.redis.hmset(`${this.swapName}:${secretHash}:deposit`, data)

    await this.redis.rpush(this.swapName, secretHash)
  }

  async _write(event, encoding, callback) {
    const data = formattedEvent(event)

    try {
      await this.save(data)
      this.push({ data })
    } catch (error) {
      this.push({ error })
    } finally {
      callback()
    }
  }

  _read() {}
}

module.exports = {
  SwapCreated,
  SwapWithdrawn,
  SwapRefunded
}
