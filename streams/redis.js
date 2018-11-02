const { Duplex } = require("stream")
const { promisify } = require("util")
const crypto = require("crypto")

const parseEvent = (data) => {
  const event = { ...data.args }

  for (let key in event) {
    if (typeof event[key].toString === 'function')
      event[key] = event[key].toString()
  }

  if (!event.buyer) {
    event.buyer = event._buyer
  }
  if (!event.seller) {
    event.seller = event._seller
  }

  return event
}

class SwapRefunded extends Duplex {
  constructor({ redisClient, swapName, reputationName, reputationMultiplier }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.swapName = swapName
    this.reputationName = reputationName
    this.reputationMultiplier = reputationMultiplier

    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
    this.decrby = promisify(this.redisClient.decrby).bind(this.redisClient)
  }

  saveEvent(event) {
    return this.hmset(`${this.swapName}:${event.secretHash}:refund`, event)
  }

  updateReputation(event) {
    const { buyer } = event

    const decreaseBuyerReputation = this.decrby(`${this.reputationName}:${buyer}`, 1 * this.reputationMultiplier)

    return decreaseBuyerReputation
  }

  _write(data, encoding, callback) {
    const event = parseEvent(data)

    this.saveEvent(event).then(() => {
      return this.updateReputation(event)
    }).then(() => {
      this.push({ event })
      callback()
    }).catch((error) => {
      this.push({ error })
      callback()
    })
  }

  _read() {}
}

class SwapWithdrawn extends Duplex {
  constructor({ redisClient, swapName, reputationName, reputationMultiplier }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.swapName = swapName
    this.reputationName = reputationName
    this.reputationMultiplier = reputationMultiplier

    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
    this.incrby = promisify(this.redisClient.INCRBY).bind(this.redisClient)
  }

  saveEvent(event) {
    return this.hmset(`${this.swapName}:${event.secretHash}:withdraw`, event)
  }

  updateReputation(event) {
    const { buyer, seller } = event

    const increaseBuyerReputation = this.incrby(`${this.reputationName}:${buyer}`, 1 * this.reputationMultiplier)
    const increaseSellerReputation = this.incrby(`${this.reputationName}:${seller}`, 1 * this.reputationMultiplier)

    return Promise.all([increaseBuyerReputation, increaseSellerReputation])
  }

  _write(data, encoding, callback) {
    const event = parseEvent(data)

    this.saveEvent(event).then(() => {
      return this.updateReputation(event)
    }).then(() => {
      this.push({ event })
      callback()
    }).catch((error) => {
      this.push({ error })
      callback()
    })
  }

  _read() {}
}

class SwapCreated extends Duplex {
  constructor({ redisClient, swapName, fetchSwapData }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.swapName = swapName

    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
    this.hget = promisify(this.redisClient.hget).bind(this.redisClient)
    this.rpush = promisify(this.redisClient.rpush).bind(this.redisClient)

    this.saveEvent = this.saveEvent.bind(this)
    this.updateIndex = this.updateIndex.bind(this)

    this.fetchSwapData = fetchSwapData
  }

  saveEvent(event) {
    return this.hmset(`${this.swapName}:${event.secretHash}:deposit`, event)
  }

  updateIndex(event) {
    if (!event.secretHash)
      return Promise.reject('swap has no secretHash')

    return this.hget(`${this.swapName}:${event.secretHash}:deposit`, 'secretHash').then((existingHash) => {
      if (existingHash !== null)
        throw new Error(`swap with hash equal to ${existingHash} already exists`)

    }).then(() => {
      return this.rpush(this.swapName, event.secretHash)
    })
  }

  _write(data, encoding, callback) {
    const event = parseEvent(data)

    this.fetchSwapData(event).then(({ value, secretHash }) => {
      event.value = value
      event.secretHash = secretHash
    }).then(() => {
      return this.updateIndex(event)
    })
    .then(() => {
      return this.saveEvent(event)
    }).then(() => {
      this.push({ event })
      callback()
    }).catch((error) => {
      this.push({ error })
      callback()
    })
  }

  _read() {}
}

let swapCreatedInstance = null
let swapWithdrawnInstance = null
let swapRefundedInstance = null

module.exports = {
  SwapCreated: ({ redisClient, swapName, fetchSwapData }) => {
    if (swapCreatedInstance === null)
      swapCreatedInstance = new SwapCreated({ redisClient, swapName, fetchSwapData })

    return swapCreatedInstance
  },
  SwapWithdrawn: ({ redisClient, swapName, reputationName, reputationMultiplier }) => {
    if (swapWithdrawnInstance === null)
      swapWithdrawnInstance = new SwapWithdrawn({ redisClient, swapName, reputationName, reputationMultiplier })

    return swapWithdrawnInstance
  },
  SwapRefunded: ({ redisClient, swapName, reputationName, reputationMultiplier }) => {
    if (swapRefundedInstance === null)
      swapRefundedInstance = new SwapRefunded({ redisClient, swapName, reputationName, reputationMultiplier })

    return swapRefundedInstance
  }
}
