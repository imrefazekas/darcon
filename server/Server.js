let Assigner = require('assign.js')
let assigner = new Assigner()

let Radiation = require( './Radiation' )

module.exports = {
	async init (config = {}) {
		let self = this

		if (!config.Darconer) throw new Error( 'Darconer is missing!' )

		self.logger = config.logger
		self.config = config

		let fastifyConfig = assigner.assign( {
			logger: self.logger || true
		}, config.fastify )

		this.fastify = require('fastify')( fastifyConfig )

		this.setupTerminationHandlers()


		if (fastifyConfig.defaultPlugins)
			await fastifyConfig.defaultPlugins( this.fastify )

		if (fastifyConfig.plugins)
			await fastifyConfig.plugins( this.fastify )


		if (self.config.rest)
			await Radiation.rester( config.Darconer, this.fastify, assigner.assign( {}, self.config.rest, { logger: self.logger } ) )
		if (self.config.ws)
			await Radiation.ws( config.Darconer, this.fastify, assigner.assign( {}, self.config.ws, { logger: self.logger } ) )


		if (fastifyConfig.routes)
			await fastifyConfig.routes( this.fastify )


		let portToMap = process.env.NODE_SERVER_PORT || self.config.port || 8080
		let ipToMap = process.env.NODE_SERVER_IP || self.config.ip || '0.0.0.0'
		await this.fastify.listen(portToMap, ipToMap)

		let po = this.fastify.server.address().port
		self.logger.info( `Server is listening on ${po}` )

		if (self.config.printRoutes)
			self.logger.info( 'Routes: ' + this.fastify.printRoutes())

		return self
	},


	setupTerminationHandlers () {
		let self = this

		process.on('SIGINT', function () {
			let timeout = 0
			if ( self.config.forcefulShutdown > 0 )
				timeout = setTimeout( () => {
					process.exit( 1 )
				}, self.config.forcefulShutdown )

			console.log('%s: Node server stopped.', new Date() )
			self.close().then( () => {
				clearTimeout( timeout )
				process.exit( 0 )
			} ).catch( (err) => {
				clearTimeout( timeout )
				console.error(err)
				process.exit( 1 )
			} )
		})
	},


	async close ( ) {
		if ( this.fastify ) {
			await this.fastify.close( )
			console.log('HTTP(S) stopped')
		}
	}
}
