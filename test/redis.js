const expect = require("chai").expect
const redis = require("fakeredis")

const { SwapCreated, SwapWithdrawn, SwapRefunded } = require('../streams/redis')

const swapName = 'someBlockchains'
const reputationName = 'someReputation'

describe('Redis Writable Streams', () => {
  describe('SwapCreated', () => {
    it('should store created swap in collection', (done) => {
      const redisClient = redis.createClient("first")

      const event = { args: { buyer: '0x1', seller: '0x2', value: '100' } }

      const stream = SwapCreated({ redisClient, swapName })

      stream.write(event, 'utf8', () => {
        redisClient.hgetall(`${swapName}:0`, (_, result) => {
          expect(result).to.be.deep.equal(event.args)
          done()
        })
      })
    })
  })

  describe('SwapWithdrawn', () => {
    it('should increase reputation of both participants', (done) => {
      const redisClient = redis.createClient("second")

      const event = { args: { buyer: '0x1', seller: '0x2' } }

      const { args: { buyer, seller } } = event

      const stream = SwapWithdrawn({ redisClient, reputationName, value: 2 })

      stream.write(event, 'utf8', () => {
        const check1 = new Promise((resolve) => {
          redisClient.get(`${reputationName}:${buyer}`, (_, result) => {
            expect(result).to.be.equal(2)
            resolve()
          })
        })

        const check2 = new Promise((resolve) => {
          redisClient.get(`${reputationName}:${seller}`, (_, result) => {
            expect(result).to.be.equal(2)
            resolve()
          })
        })

        Promise.all([check1, check2]).then(() => {
          done()
        })
      })
    })
  })

  describe('SwapRefunded', () => {
    it('should decrease reputation of buyer', (done) => {
      const redisClient = redis.createClient("third")

      const event = { args: { buyer: '0x1', seller: '0x2' } }

      const { args: { buyer, seller } } = event

      const stream = SwapRefunded({ redisClient, reputationName, value: 1 })

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