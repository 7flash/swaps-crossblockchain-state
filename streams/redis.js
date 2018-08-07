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

class SwapReputation extends Duplex {
  constructor({ redisClient, reputationName, pointsPerEvent, isPositiveEvent }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.reputationName = reputationName
    this.pointsPerEvent = pointsPerEvent
    this.isPositiveEvent = isPositiveEvent
  }

  _write(chunk, encoding, callback) {
    const event = { ...chunk.args }

    const { seller, buyer } = event

    if (this.isPositiveEvent === true) {
      const p1 = new Promise(resolve => this.redisClient.INCRBY(`${this.reputationName}:${seller}`, this.pointsPerEvent, resolve))
      const p2 = new Promise(resolve => this.redisClient.INCRBY(`${this.reputationName}:${buyer}`, this.pointsPerEvent, resolve))

      Promise.all([p1, p2]).then(() => {
        callback()
      })
    } else {
      this.redisClient.DECRBY(`${this.reputationName}:${buyer}`, this.pointsPerEvent, callback)
    }
  }

  _read() {}
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
  SwapWithdrawn: ({ redisClient, reputationName, pointsPerEvent }) => {
    if (swapWithdrawnInstance === null)
      swapWithdrawnInstance = new SwapReputation({ redisClient, reputationName, pointsPerEvent, isPositiveEvent: true })

    return swapWithdrawnInstance
  },
  SwapRefunded: ({ redisClient, reputationName, pointsPerEvent }) => {
    if (swapRefundedInstance === null)
      swapRefundedInstance = new SwapReputation({ redisClient, reputationName, pointsPerEvent, isPositiveEvent: false })

    return swapRefundedInstance
  }
}