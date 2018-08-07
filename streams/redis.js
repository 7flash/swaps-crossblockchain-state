const { Writable, Duplex } = require("stream")

class SwapCreated extends Duplex {
  constructor({ redisClient, swapName }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.swapName = swapName
    this.collectionIndex = 0
  }

  _write(chunk, encoding, callback) {
    const event = { ...chunk.args }

    for (let key in event) {
      if (typeof event[key].toString === 'function')
        event[key] = event[key].toString()
    }

    const key = `${this.swapName}:${this.collectionIndex}`
    this.collectionIndex++
    this.redisClient.hmset(key, event, callback)

    this.push({ key, event })
  }

  _read() {}
}

class SwapReputation extends Writable {
  constructor({ redisClient, reputationName, value, success }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.reputationName = reputationName
    this.value = value
    this.success = success
  }

  _write(chunk, encoding, callback) {
    const event = { ...chunk.args }

    const { seller, buyer } = event

    if (this.success === true) {
      const p1 = new Promise(resolve => this.redisClient.INCRBY(`${this.reputationName}:${seller}`, this.value, resolve))
      const p2 = new Promise(resolve => this.redisClient.INCRBY(`${this.reputationName}:${buyer}`, this.value, resolve))

      Promise.all([p1, p2]).then(() => callback() )
    } else {
      this.redisClient.DECRBY(`${this.reputationName}:${buyer}`, this.value, callback)
    }
  }
}

let swapCreatedInstance = null
let swapWithdrawnInstance = null
let swapRefundedInstance = null

module.exports = {
  SwapCreated: ({ redisClient, swapName }) => {
    if (swapCreatedInstance === null)
      swapCreatedInstance = new SwapCreated({ redisClient, swapName })

    return swapCreatedInstance
  },
  SwapWithdrawn: ({ redisClient, reputationName, value }) => {
    if (swapWithdrawnInstance === null)
      swapWithdrawnInstance = new SwapReputation({ redisClient, reputationName, value, success: true })

    return swapWithdrawnInstance
  },
  SwapRefunded: ({ redisClient, reputationName, value }) => {
    if (swapRefundedInstance === null)
      swapRefundedInstance = new SwapReputation({ redisClient, reputationName, value, success: false })

    return swapRefundedInstance
  }
}