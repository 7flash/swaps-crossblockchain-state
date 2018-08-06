const { Writable } = require("stream")

class SwapCreated extends Writable {
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
  }
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

let SwapCreated = null
let SwapWithdrawn = null
let SwapRefunded = null

module.exports = {
  SwapCreated: ({ redisClient, swapName }) => {
    if (SwapCreated === null)
      SwapCreated = new SwapCreated({ redisClient, swapName })

    return SwapCreated
  },
  SwapWithdrawn: ({ redisClient, reputationName, value }) => {
    if (SwapWithdrawn === null)
      SwapWithdrawn = new SwapReputation({ redisClient, reputationName, value, success: true })

    return SwapWithdrawn
  },
  SwapRefunded: ({ redisClient, reputationName, value }) => {
    if (SwapRefunded === null)
      SwapRefunded = new SwapReputation({ redisClient, reputationName, value, success: false })

    return SwapRefunded
  }
}