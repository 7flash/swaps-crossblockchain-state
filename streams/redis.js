const { Duplex } = require("stream")

class SwapCreated extends Duplex {
  constructor({ redisClient, swapName }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.swapName = swapName
  }

  _write(chunk, encoding, callback) {
    const event = { ...chunk.args }

    for (let key in event) {
      if (typeof event[key].toString === 'function')
        event[key] = event[key].toString()
    }

    const key = `${this.swapName}:${event.secretHash}`

    this.redisClient.hget(key, 'secretHash', (_, existingEvent) => {
      if (existingEvent === null) {
        this.redisClient.rpush(this.swapName, event.secretHash, () => {
          this.redisClient.hmset(key, event, () => {
            this.push({ key, event })
            callback()
          })
        })
      } else {
        callback()
      }
    })
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
      const p1 =
        new Promise(resolve => this.redisClient.INCRBY(`${this.reputationName}:${seller}`, this.pointsPerEvent, () => resolve(seller)))
          .then((participant) => this.push({ participant, points: this.pointsPerEvent }))

      const p2 =
        new Promise(resolve => this.redisClient.INCRBY(`${this.reputationName}:${buyer}`, this.pointsPerEvent, () => resolve(buyer)))
          .then((participant) => this.push({ participant, points: this.pointsPerEvent }))

      Promise.all([p1, p2]).then(() => {
        callback()
      })
    } else {
      this.redisClient.DECRBY(`${this.reputationName}:${buyer}`, this.pointsPerEvent, () => {
        this.push({ participant: buyer, points: this.pointsPerEvent })
        callback()
      })
    }
  }

  _read() {}
}

let swapCreatedInstance = null
let swapWithdrawnInstance = null
let swapRefundedInstance = null

let bitcoinTransactionInstance = null

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
  },

  BitcoinTransaction: ({ redisClient, swapName }) => {
    if (bitcoinTransactionInstance === null)
      bitcoinTransactionInstance = new BitcoinTransaction({ redisClient, swapName })

    return bitcoinTransactionInstance
  }
}