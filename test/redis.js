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
  const pointsPerEvent = 2

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
      stream = SwapWithdrawn({ redisClient, reputationName, pointsPerEvent })

      stream.write(event, 'utf8', () => {
        done()
      })
    })

    it('should flow as a duplex stream', () => {
      const log1 = stream.read()
      const log2 = stream.read()

      expect(log1).to.be.deep.equal({ participant: seller, points: pointsPerEvent })
      expect(log2).to.be.deep.equal({ participant: buyer, points: pointsPerEvent })
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
    before((done) => {
      redisClient = redis.createClient("third")
      stream = SwapRefunded({ redisClient, reputationName, pointsPerEvent })

      stream.write(event, 'utf8', () => {
        done()
      })
    })

    it('should flow as a duplex stream', () => {
      const log = stream.read()

      expect(log).to.be.deep.equal({ participant: buyer, points: pointsPerEvent })
    })

    it('should decrease reputation of buyer', (done) => {
      redisClient.get(`${reputationName}:${buyer}`, (_, result) => {
        expect(result).to.be.equal(-(pointsPerEvent))
        done()
      })
    })

    it('should not touch the reputation of seller', (done) => {
      redisClient.get(`${reputationName}:${seller}`, (_, result) => {
        expect(result).to.be.equal(null)
        done()
      })
    })
  })
})