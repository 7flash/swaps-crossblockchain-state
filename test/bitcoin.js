const expect = require("chai").expect
const sinon = require("sinon")

const { TransactionsStream, SwapsSearchStream } = require('../blockchains/bitcoin')

const withdrawTx = {"lock_time":0,"ver":1,"size":366,"inputs":[{"sequence":4294967294,"witness":"","prev_out":{"spent":true,"tx_index":286514715,"type":0,"addr":"2NF6w4wrC6e1Y92MZZFR3ZXuzeuh3XJWoe4","value":3659662,"n":0,"script":"a914efc150d62f9f46066bf003086cac69fc981e8e0587"},"script":"47304402206986dd400b116816727eaa44d431c57a4559e8ddb9c42ba84e3522ccaa8ca10d02203537af853dedb1f03f2f8b1535aff4b3155b2135bdbe05775b3b5e4c6ef587e50121037401a8ca1dfdf76402ff94c654240aa4a680ec4594dfa9d8f4684d054fe21b2120a3256d23439dc03fdc798bd306b57c07ecb45782933cb93e24cb90f0c6238fb04c8aa614e5adc5a79208a4dfdb684eebcf23dc577b28c0228821037401a8ca1dfdf76402ff94c654240aa4a680ec4594dfa9d8f4684d054fe21b21876321037401a8ca1dfdf76402ff94c654240aa4a680ec4594dfa9d8f4684d054fe21b21ac670488a0e45bb1752103c981aeea0b8f3cc6141f2ec9241819a77ee29dbf73cf28c111914908ba268374ac68"}],"weight":1464,"time":1541699209,"tx_index":286514727,"vin_sz":1,"hash":"338545a068a04b17d17b109af20dddeca34926e03b9de5a6d1ad5557a19216fc","vout_sz":1,"relayed_by":"0.0.0.0","out":[{"spent":true,"tx_index":286514727,"type":0,"addr":"mnCLLbtNuXfmHHbDunyjqj61o63XjxNCpG","value":3654662,"n":0,"script":"76a914494360e987206e8978eeceaa757f9a1627cd66f388ac"}]}
const anotherWithdrawTx = { ...withdrawTx }
const swap = {
    withdrawTx: '338545a068a04b17d17b109af20dddeca34926e03b9de5a6d1ad5557a19216fc',
    fundingAddress: '2NF6w4wrC6e1Y92MZZFR3ZXuzeuh3XJWoe4',
    withdrawFee: 5000,
    buyer: '17gP3YoQ6WEWWB7cCE1N1osgw6Spsf2VEy',
    seller: '112M64u6WbDPc7K7ydEsaE3vXHwSVJVcY3',
    secret: 'a3256d23439dc03fdc798bd306b57c07ecb45782933cb93e24cb90f0c6238fb0',
    secretHash: 'e5adc5a79208a4dfdb684eebcf23dc577b28c022',
    timeLock: 1541709960
}

const blockExplorer = (() => {
  const getLatestBlockStub = sinon.stub()
  getLatestBlockStub.onCall(0).returns(1)
  getLatestBlockStub.returns(2)

  const getBlockHeightStub = sinon.stub()
  getBlockHeightStub.withArgs(1).resolves({ blocks: [{ tx: [withdrawTx] }]})
  getBlockHeightStub.withArgs(2).resolves({ blocks: [{ tx: [anotherWithdrawTx] }]})

  const blockExplorer = {
    getBlockHeight: getBlockHeightStub,
    getLatestBlock: getLatestBlockStub
  }

  return blockExplorer
})()

describe('Bitcoin', () => {
  describe('Transactions stream', () => {
    it('should push transactions from blocks', (done) => {
      const stream = new TransactionsStream({ blockExplorer, startBlock: 1, blockIntervalInSeconds: 1 })

      setImmediate(() => {
        expect(stream.read()).to.be.equal(withdrawTx)
        expect(stream.read()).to.be.equal(null)

        setTimeout(() => {
          expect(stream.read()).to.be.equal(anotherWithdrawTx)
          done()
        }, 1500)
      })
    })
  })

  describe('Swaps search stream', () => {
    it('should parse swap script', (done) => {
      const stream = new SwapsSearchStream()

      stream.write(withdrawTx, 'utf8', () => {
        const result = stream.read()

        expect(result).to.be.deep.equal(swap)

        done()
      })
    })
  })
})
