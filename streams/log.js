const { Writable } = require("stream")

class LogStream extends Writable {
  constructor() {
    super({ objectMode: true })
  }

  _write(chunk, encoding, callback) {
    const event = { ...chunk.args }

    console.log(event)
  }
}

module.exports = () => {
  return new LogStream()
}