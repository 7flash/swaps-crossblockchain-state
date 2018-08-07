const expect = require("chai").expect
const redis = require("fakeredis")

const { SwapCreated, SwapWithdrawn, SwapRefunded } = require('../streams/redis')

const swapName = 'someBlockchains'
const reputationName = 'someReputation'

describe('Redis Writable Streams', () => {
  let redisClient
  let stream

  const buyer = '0x1'
  const seller = '0x2'
  const value = '100'
  const event = { args: { buyer, seller, value } }

  describe('SwapCreated', () => {
    const key = `${swapName}:0`

    before((done) => {
      redisClient = redis.createClient("first")
      stream = SwapCreated({ redisClient, swapName })

      stream.write(event, 'utf8', () => {
        done()
      })
    })

    it('should flow as a duplex stream', () => {
      const log = stream.read()

      expect(log).to.be.deep.equal({ key, event: event.args })
    })

    it('should store created swap in collection', (done) => {
      redisClient.hgetall(key, (_, result) => {
        expect(result).to.be.deep.equal(event.args)
        done()
      })
    })
  })

  describe('SwapWithdrawn', () => {
    before((done) => {
      redisClient = redis.createClient("second")
      stream = SwapWithdrawn({ redisClient, reputationName, pointsPerEvent: 2 })

      stream.write(event, 'utf8', () => {
        done()
      })
    })

    it('should increase reputation of buyer', (done) => {
      redisClient.get(`${reputationName}:${buyer}`, (_, result) => {
        expect(result).to.be.equal(2)
        done()
      })
    })

    it('should increase reputation of seller', (done) => {
      redisClient.get(`${reputationName}:${seller}`, (_, result) => {
        expect(result).to.be.equal(2)
        done()
      })
    })
  })

  describe('SwapRefunded', () => {
    it('should decrease reputation of buyer', (done) => {
      const redisClient = redis.createClient("third")

      const event = { args: { buyer: '0x1', seller: '0x2' } }

      const { args: { buyer, seller } } = event

      const stream = SwapRefunded({ redisClient, reputationName, pointsPerEvent: 1 })

      stream.write(event, 'utf8', () => {
        const check1 = new Promise((resolve) => {
          redisClient.get(`${reputationName}:${buyer}`, (_, result) => {
            expect(result).to.be.equal(-1)
            resolve()
          })
        })

        const check2 = new Promise((resolve) => {
          redisClient.get(`${reputationName}:${seller}`, (_, result) => {
            expect(result).to.be.equal(null)
            resolve()
          })
        })

        Promise.all([check1, check2]).then(() => {
          done()
        })
      })
    })
  })
})