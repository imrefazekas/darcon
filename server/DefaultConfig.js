let attributesRespected = [ 'user', 'files' ]

module.exports = {
	port: 8080,
	ip: '0.0.0.0',

	Darconer: null,
	logger: null,
	fastify: {
		apiPrefix: '',
		defaultPlugins (fastify) { },
		plugins (fastify) { },
		routes (fastify) { },
		preValidation (fastify, path) { return { } },

		async wsPreprocess ( socket, data ) { }
	},

	printRoutes: true,
	forcefulShutdown: 0,

	rest: {
		standard: true,
		darcon: '/DarconRPC',
		attributesRespected,
		gatekeeper: {}
	},
	ws: {
		darcon: '/DarconWS'
	}
}
