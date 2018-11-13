const expect = require("chai").expect
const redis = require("fakeredis")

const { SwapCreated, SwapWithdrawn, SwapRefunded } = require('../reducers/redis/ethereum')
const { BitcoinRedisStream } = require('../reducers/redis/bitcoin')

describe('Redis Writable Streams', () => {
  let redisClient
  let stream

  describe('Bitcoin', () => {
    const swapName = 'bitcoin'
    const reputationName = 'bitcoinReputation'
    const reputationMultiplier = 2

    const bitcoinSwapPrepared = {
      secretHash: 'e5adc5a79208a4dfdb684eebcf23dc577b28c022',
      buyer: '17gP3YoQ6WEWWB7cCE1N1osgw6Spsf2VEy',
      seller: '112M64u6WbDPc7K7ydEsaE3vXHwSVJVcY3'
    }

    before((done) => {
      redisClient = redis.createClient("bitcoin")
      stream = new BitcoinRedisStream({ redisClient, swapName, reputationName, reputationMultiplier })

      stream.write(bitcoinSwapPrepared, 'utf8', () => {
        done()
      })
    })

    it('should flow as a duplex stream', () => {
      const log = stream.read()

      expect(log).to.be.deep.equal(bitcoinSwapPrepared)
    })

    it('should save swap in collection', (done) => {
      redisClient.lrange(swapName, 0, 10, (error, result) => {
        expect(result[0]).to.be.equal(bitcoinSwapPrepared.secretHash)

        redisClient.hgetall(`${swapName}:${bitcoinSwapPrepared.secretHash}`, (_, result) => {
          expect(result).to.be.deep.equal(bitcoinSwapPrepared)

          done()
        })
      })
    })
  })

  describe('Ethereum', () => {
    const swapName = 'ethereum'
    const reputationName = 'ethereumReputation'

    const buyer = '0x1'
    const seller = '0x2'
    const value = '100'
    const createdAt = '555'
    const secretHash = 'xff'
    const event = { args: { buyer, seller, value, createdAt, secretHash } }
    const reputationMultiplier = 2

    let expectedEvent = { args: { ...event.args, value: "200" } }
    const fetchSwapData = (event) => Promise.resolve({ value: "200", secretHash: secretHash })

    describe('SwapCreated', () => {
      before((done) => {
        redisClient = redis.createClient("first")
        stream = new SwapCreated({ redisClient, swapName, fetchSwapData })

        stream.write(event, 'utf8', () => {
          done()
        })
      })

      it('should flow as a duplex stream', () => {
        const log = stream.read()

        expect(log).to.be.deep.equal({ event: expectedEvent.args })
      })

      it('should store created swap in collection', (done) => {
        redisClient.lrange(swapName, 0, 0, (_, secretHashes) => {
          expect(secretHashes[0]).to.be.equal(event.args.secretHash)

          redisClient.hgetall(`${swapName}:${event.args.secretHash}:deposit`, (_, result) => {
            expect(result).to.be.deep.equal(expectedEvent.args)

            done()
          })
        })
      })

      it('should ignore swap with duplicated secretHash', (done) => {
        stream.write(event, 'utf8', () => {
          const log = stream.read()

          expect(log.error instanceof Error).to.be.equal(true)

          done()
        })
      })
    })

    describe('SwapWithdrawn', () => {
      before((done) => {
        redisClient = redis.createClient("second")
        stream = new SwapWithdrawn({ redisClient, swapName, reputationName, reputationMultiplier })

        stream.write(event, 'utf8', () => {
          done()
        })
      })

      it('should flow as a duplex stream', () => {
        const log = stream.read()

        expect(log).to.be.deep.equal({ event: event.args })
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
        stream = new SwapRefunded({ redisClient, swapName, reputationName, reputationMultiplier })

        stream.write(event, 'utf8', () => {
          done()
        })
      })

      it('should flow as a duplex stream', () => {
        const log = stream.read()

        expect(log).to.be.deep.equal({ event: event.args })
      })

      it('should decrease reputation of buyer', (done) => {
        redisClient.get(`${reputationName}:${buyer}`, (_, result) => {
          expect(result).to.be.equal(-(reputationMultiplier))
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
})
