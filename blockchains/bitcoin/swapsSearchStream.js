const { Transform } = require('stream')
const assert = require('assert')
const bitcoin = require('bitcoinjs-lib')

class SwapsSearchStream extends Transform {
  constructor(network = 'testnet') {
    super({ objectMode: true })

    this.network = bitcoin.networks[network]
  }

  parseTransaction(tx) {
    const withdrawTx = tx.hash
    const fundingAddress = tx.inputs[0].prev_out.addr
    const scriptHex = tx.inputs[0].script
    const value = tx.inputs[0].prev_out.value
    const withdrawFee = this.calculateFee(tx)

    return { withdrawTx, withdrawFee, fundingAddress, scriptHex, value }
  }

  calculateFee(tx) {
    const inputsValue = tx.inputs.reduce((total, input) => total + input.prev_out.value, 0)
    const outputsValue = tx.out.reduce((total, output) => total + output.value, 0)

    return inputsValue - outputsValue
  }

  parseScript(scriptHex) {
    const stack = bitcoin.script.decompile(Buffer.from(scriptHex, 'hex'))

    const signature = stack[0].toString('hex')
    const recipientPublicKey = stack[1].toString('hex')
    const secret = stack[2].toString('hex')

    const script = bitcoin.script.toASM(stack[3]).split(' ')

    assert.equal(script[0], 'OP_RIPEMD160')
    const secretHash = script[1]
    assert.equal(script[2], 'OP_EQUALVERIFY')
    assert.equal(script[3], recipientPublicKey)
    assert.equal(script[4], 'OP_EQUAL')
    assert.equal(script[5], 'OP_IF')
    assert.equal(script[6], recipientPublicKey)
    assert.equal(script[7], 'OP_CHECKSIG')
    assert.equal(script[8], 'OP_ELSE')
    const timeLock = bitcoin.script.number.decode(Buffer.from(script[9], 'hex'))
    assert.equal(script[10], 'OP_CHECKLOCKTIMEVERIFY')
    assert.equal(script[11], 'OP_DROP')
    const ownerPublicKey = script[12]
    assert.equal(script[13], 'OP_CHECKSIG')
    assert.equal(script[14], 'OP_ENDIF')

    const seller = bitcoin.ECPair.fromPublicKeyBuffer(Buffer.from(ownerPublicKey, 'hex'), this.network).getAddress()
    const buyer = bitcoin.ECPair.fromPublicKeyBuffer(Buffer.from(recipientPublicKey, 'hex'), this.network).getAddress()

    const result = { buyer, seller, secret, secretHash, timeLock, signature }

    return result
  }

  _transform(data, encoding, callback) {
    try {
      const { withdrawTx, withdrawFee, fundingAddress, scriptHex, value } = this.parseTransaction(data)
      const { buyer, seller, secretHash, secret, timeLock } = this.parseScript(scriptHex)

      const swap = {
        buyer,
        seller,
        secret,
        secretHash,
        timeLock,
        withdrawTx,
        fundingAddress,
        withdrawFee,
        value
      }

      this.push(swap)

      console.log(`found swap: ${data.hash}`)
    } catch(e) {
    } finally {
      callback()
    }
  }
}

module.exports = SwapsSearchStream
