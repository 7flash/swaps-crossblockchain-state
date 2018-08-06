const expect = require("chai").expect
const sinon = require("sinon")

const spy = sinon.spy()
const stub = sinon.stub(require('web3-stream'), 'Web3EventStream').value(spy)
const web3 = sinon.stub()
const contract = { Created: 'event1', Withdrawn: 'event2', Refunded: 'event3' }
const fromBlock = 1

const {
  SwapCreated,
  SwapWithdrawn,
  SwapRefunded
} = require('../streams/ethbtc')

describe('ETH <=> BTC', () => {
  describe('SwapCreated', () => {
    it('should instantiate readable stream', () => {
      const stream = SwapCreated({ web3, contract, fromBlock })

      expect(spy.calledWithNew()).to.be.true
      expect(spy.calledWithExactly(web3, 'event1', {}, { fromBlock })).to.be.true
    })
  })

  describe('SwapWithdrawn', () => {
    it('should instantiate readable stream', () => {
      const stream = SwapWithdrawn({ web3, contract, fromBlock })

      expect(spy.calledWithNew()).to.be.true
      expect(spy.calledWithExactly(web3, 'event2', {}, { fromBlock })).to.be.true
    })
  })

  describe('SwapRefunded', () => {
    it('should instantiate readable stream', () => {
      const stream = SwapRefunded({ web3, contract, fromBlock })

      expect(spy.calledWithNew()).to.be.true
      expect(spy.calledWithExactly(web3, 'event3', {}, { fromBlock })).to.be.true
    })
  })
})