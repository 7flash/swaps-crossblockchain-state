const expect = require("chai").expect
const sinon = require("sinon")

const spy = sinon.spy()
const stub = sinon.stub(require('web3-stream'), 'Web3EventStream').value(spy)
const web3 = sinon.stub()
const contract = { CreateSwap: 'event1', Withdraw: 'event2', Refund: 'event3' }
const fromBlock = 1

const {
  SwapCreated,
  SwapWithdrawn,
  SwapRefunded
} = require('../blockchains/ethereum')

describe('Ethereum stream', () => {
  describe('SwapCreated', () => {
    it('should instantiate readable stream', () => {
      const stream = new SwapCreated(web3, contract.CreateSwap, fromBlock)

      expect(spy.calledWithNew()).to.be.true
      expect(spy.calledWithExactly(web3, 'event1', {}, { fromBlock })).to.be.true
    })
  })

  describe('SwapWithdrawn', () => {
    it('should instantiate readable stream', () => {
      const stream = new SwapWithdrawn(web3, contract.Withdraw, fromBlock)

      expect(spy.calledWithNew()).to.be.true
      expect(spy.calledWithExactly(web3, 'event2', {}, { fromBlock })).to.be.true
    })
  })

  describe('SwapRefunded', () => {
    it('should instantiate readable stream', () => {
      const stream = new SwapRefunded(web3, contract.Refund, fromBlock)

      expect(spy.calledWithNew()).to.be.true
      expect(spy.calledWithExactly(web3, 'event3', {}, { fromBlock })).to.be.true
    })
  })
})
