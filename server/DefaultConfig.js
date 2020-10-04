let attributesRespected = [ 'user', 'files', 'agent' ]

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
		attributesToPass: []
		// async gatekeeper ( request, flowID, processID, entity, message, params ) {},
		// async conformer ( request, flowID, processID, entity, message, res ) {}
	},
	ws: {
		darcon: '/DarconWS'
	}
}
