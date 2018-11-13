const bitcoin = require('./services/bitcoin')
const ethereum = require('./services/ethereum')

bitcoin.start()
ethereum.start()
