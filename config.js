module.exports = {
	idLength: 16,

	reporterInterval: 5000,
	keeperInterval: 15000,

	reponseTolerance: 5000,

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
