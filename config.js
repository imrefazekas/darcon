module.exports = {
	idLength: 16,
	reporterInterval: 2000,
	keeperInterval: 3000,

	reponseTolerance: 10000,

	maxReconnectAttempts: -1,
	reconnectTimeWait: 250,

	nats: {
		url: 'nats://localhost:4222'
	},

	strict: false,

	commSize: 1000000 / 2,
	maxCommSize: 5000000 / 2,

	log: {
		level: process.env.DARCON_LOG_LEVEL || 'info',
		prettyPrint: process.env.DARCON_LOG_PRETTY || false
	}
}
