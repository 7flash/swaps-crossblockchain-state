const expect = require("chai").expect
const redis = require("fakeredis")

const { SwapCreated, SwapWithdrawn, SwapRefunded, BitcoinTransaction } = require('../streams/redis')

const swapName = 'someBlockchains'
const reputationName = 'someReputation'

describe('Redis Writable Streams', () => {
  let redisClient
  let stream

  const buyer = '0x1'
  const seller = '0x2'
  const value = '100'
  const createdAt = '555'
  const secretHash = 'xff'
  const event = { args: { buyer, seller, value, createdAt, secretHash } }
  const pointsPerEvent = 2

  describe('SwapCreated', () => {
    before((done) => {
      redisClient = redis.createClient("first")
      stream = SwapCreated({ redisClient, swapName })

      stream.write(event, 'utf8', () => {
        done()
      })
    })

    it('should flow as a duplex stream', () => {
      const key = `${swapName}:${event.args.secretHash}`

      const log = stream.read()

      expect(log).to.be.deep.equal({ key, event: event.args })
    })

    it('should store created swap in collection', (done) => {
      redisClient.lrange(swapName, 0, 0, (_, secretHashes) => {
        expect(secretHashes[0]).to.be.equal(event.args.secretHash)

        redisClient.hgetall(`${swapName}:${event.args.secretHash}`, (_, result) => {
          expect(result).to.be.deep.equal(event.args)

          done()
        })
      })
    })

    it('should ignore swap with duplicated secretHash', (done) => {
      stream.write(event, 'utf8', () => {
        const log = stream.read()

        expect(log).to.be.equal(null)

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

  const fundingTransaction = {
    type: "funding",
    transaction: {
      secretHash: 'xff',
      status: 'funded',
      startTime: '1',
      buyerFee: '1',
      value: '1',
      buyerAddress: '1a',
      sellerAddress: '1b',
      fundingTxId: '1c'
    }
  }
  const withdrawalTransaction = {
    type: "withdrawal",
    transaction: {
      secretHash: 'xff',
      withdrawalTxId: '1d',
      status: 'withdrawn',
      endTime: '2',
      sellerFee: '2'
    }
  }
  const refundTransaction = {
    type: "refund",
    transaction: {
      secretHash: 'hff',
      refundTxId: '1e',
      status: 'refund',
      endTime: '2',
      sellerFee: '2'
    }
  }
  const bitcoinSwapName = 'btceth'
  describe('BitcoinTransaction', () => {
    before(() => {
      redisClient = redis.createClient("fourth")
      stream = BitcoinTransaction({ redisClient, swapName: bitcoinSwapName })
    })

    it('store data from funding transaction in collection indexed by secretHash', (done) => {
      stream.write(fundingTransaction, 'utf8', () => {
        redisClient.lrange(bitcoinSwapName, 0, 0, (_, secretHashes) => {
          redisClient.hgetall(`${bitcoinSwapName}:${secretHashes[0]}`, (_, result) => {
            expect(result).to.be.deep.equal(fundingTransaction.transaction)
            done()
          })
        })
      })
    })

    it('update data when withdrawal transaction confirms', (done) => {
      stream.write(withdrawalTransaction, 'utf8', () => {
        redisClient.lrange(bitcoinSwapName, 0, 0, (_, secretHashes) => {
          redisClient.hgetall(`${bitcoinSwapName}:${secretHashes[0]}`, (_, result) => {
            expect(result).to.be.deep.equal({ ...fundingTransaction.transaction, ...withdrawalTransaction.transaction })
            done()
          })
        })
      })
    })

    it('should ignore transaction with repeating secretHash', (done) => {
      stream.write(fundingTransaction, 'utf8', () => {
        redisClient.lrange(bitcoinSwapName, 1, 1, (_, result) => {
          expect(result).to.be.deep.equal([])
          done()
        })
      })
    })
  })
})