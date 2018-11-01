const { Readable } = require("stream")
const IPFS = require("ipfs")
const Room = require("ipfs-pubsub-room")

class Ipfs extends Readable {
  constructor({ ipfsOptions, roomName, bitpay, listeningEvent }) {
    super({ objectMode: true })

    this.listeningEvent = listeningEvent
    this.bitpay = bitpay
    this.roomName = roomName

    this.ipfs = new IPFS(ipfsOptions)

    this.connection = Room(this.ipfs, this.roomName)

    this.connection.on('message', (message) => {
      const messageData = JSON.parse(message.data)

      const { event, data } = messageData.messages[0]

      if (event === this.listeningEvent) {
        this.push({ event, data })
      }
    })
  }
}

class FindBitcoinSwaps extends Transform {
  consturctor() {

  }

  _read() {

  }

  _write(chunk, encoding, callback) {
    const address = chunk.data.order.owner.btc.address

    const url = `${this.bitpay}/txs/?address=${address}`

    r2(url)
  }
}

module.exports = {

}