const { Readable } = require("stream")

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class TransactionsStream extends Readable {
  constructor({ startBlock, blockExplorer, blockIntervalInSeconds }) {
    super({ objectMode: true })

    this.startBlock = startBlock
    this.blockExplorer = blockExplorer
    this.blockIntervalInSeconds = blockIntervalInSeconds

    this.start()
  }

  async start() {
    let currentBlock = this.startBlock
    let latestBlock = await this.blockExplorer.getLatestBlock()

    while (true) {
      await this.loadTransactions(currentBlock)

      currentBlock++
      if (currentBlock > latestBlock) {
        await this.waitForBlock(currentBlock)
      }
    }
  }

  async loadTransactions (blockNumber) {
    const result = await this.blockExplorer.getBlockHeight(blockNumber)
    const transactions = result.blocks[0].tx

    for (const transaction of transactions) {
      this.push(transaction)
    }

    console.log(`block ${blockNumber} done`)
  }

  async waitForBlock(blockNumber) {
    await sleep(this.blockIntervalInSeconds * 1000)

    const latestBlock = await this.blockExplorer.getLatestBlock()
    if (blockNumber > latestBlock) {
      await this.waitForBlock(blockNumber)
    }
  }

  _read() {}
}


module.exports = TransactionsStream
