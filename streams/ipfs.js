const { Readable } = require("stream")

class Messages extends Readable {
  constructor({ room, events }) {
    super({ objectMode: true })

    this.room = room
    this.events = events

    this.room.on('message', (response) => {
      const { data: { messages } } = response

      messages.forEach((message) => {
        const { event, data } = message

        if (this.events.includes(event)) {
          this.push({ event, data })
        }
      })
    })
  }

  _read() {}
}

let ipfsMessagesInstance = null

module.exports = {
  Messages: ({ options, room, events }) => {
    if (ipfsMessagesInstance === null)
      ipfsMessagesInstance = new Messages({ options, room, events })

    return ipfsMessagesInstance
  }
}