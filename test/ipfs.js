const expect = require("chai").expect
const sinon = require("sinon")
const IPFS = require("ipfs")
const IPFSRepo = require("ipfs-repo")
const Room = require("ipfs-pubsub-room")
const path = require("path")

const Stream = require('../streams/ipfs')

const options = {
  EXPERIMENTAL: {
    pubsub: true
  },
  config: {
    Addresses: {
      Swarm: [
        '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
      ]
    }
  }
}
const room = 'swaps.sevenflash'

describe('Ipfs Stream', function () {
  this.timeout(20000)

  let stream = null

  const user = {
    repo: null,
    node: null,
    room: null
  }

  const events = ['initiate', 'withdraw']

  before((done) => {
    stream = Stream.Messages({ options, room, events })
    done()
  })

  after((done) => {
    stream.stop(done)
  })

  it('should expose readable only stream', () => {
    expect(stream).to.not.have.a.property('write')
    expect(stream).to.have.a.property('read')
  })
})