module.exports = {
	idLength: 16,

	reponseTolerance: 5000,

	reporterInterval: 5000,
	keeperInterval: 20000,

	maxReconnectAttempts: -1,
	reconnectTimeWait: 250,
	connectTimeWait: 2500,
	connectionPatience: -1,

	strict: false,

	nats: {
		servers: 'nats://localhost:4222',
		headers: true,
		reconnect: true,
		reconnectTimeWait: 10,
		maxReconnectAttempts: -1
	},

	commSize: 1000000 / 2,
	maxCommSize: 5000000 / 2
}
