const { Writable } = require("stream")

class LogStream extends Writable {
  constructor() {
    super({ objectMode: true })
  }

  _write(chunk, encoding, callback) {
    console.log(chunk)
    callback()
  }
}

module.exports = () => {
  return new LogStream()
}