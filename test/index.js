const expect = require("chai").expect
const sinon = require("sinon")
const redis = require("fakeredis")

const launchReducerStreams = require('../index.js')

const ethStreams = require('../streams/ethbtc')
const redisStreams = require('../streams/redis')

// integration test
describe("Reduce multi-chain transactions to the list of swaps and reputations", () => {
  before(() => {
    launchReducerStreams()
  })

  it('should save created swap to redis collection when ethereum contract emits `Created` event', () => {
  })

  it('should increase reputation of both participants when ethereum contract emits `Withdrawn` event', () => {
  })

  it('should decrease reputation of buyer when ethereum contract emits `Refunded` event', () => {
  })
})