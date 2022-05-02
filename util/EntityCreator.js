const path = require('path')

const _ = require( 'isa.js' )

let Darcon = require('../Darconer')
let { MODE_REQUEST, MODE_INFORM } = require( '../Models' )
let Server = require('../server/Server')

let { functions } = require( '../util/Extender' )

let Proback = require( 'proback.js' )

const DEFAULT_DB = {
	url: process.env.FLUX_URL || 'mongodb://localhost:27017',
	dbName: process.env.FLUX_DB || 'Flux'
}

let SEQ = 1
let Services = {
	functionsToBeIgnored (list) {
		FUNCTIONS_TO_BE_IGNORED = list
	},

	async injectEssence (entity, config) {
		entity.Essence = FluxConnector.connector()

		entity.mongo = new Mongo()
		await entity.mongo.init( {
			mongo: config.essenceDB || DEFAULT_DB, logger: config.logger
		}, entity.Essence )

		if (config.cache) {
			entity.Cache = new Cache( 'Redis' )
			await entity.Cache.init( config.cache )
		}

		let sequencer = config.sequencer && !config.sequencer.local ? Sequencer.client( config.sequencer ) : {
			async connect () {},
			async obtainIdentifiers ( ) { return SEQ++ }
		}
		await sequencer.connect()
		let balico = config.balico && !config.balico.local ? Balico.client( config.balico ) : require( './IMBalico' )
		await balico.connect()

		if (config.essence)
			entity.Essence.config( config.essence )
		entity.Essence.links( { Sequencer: sequencer, Balico: balico } )
		entity.Essence.logger( entity.logger )

		if (!entity.links) entity.links = {}
		entity.links.Sequencer = sequencer
		entity.links.Balico = balico

		if (!entity.entityLinked)
			entity.entityLinked = async function ( name ) {
				if (this.Essence)
					this.Essence.link( name, this.links[name] )
			}

		entity._terminate = entity.terminate
		entity.terminate = async function ( ) {
			if (this.mongo)
				await this.mongo.terminate( )
			if (this.Essence)
				await this.Essence.terminate()

			if (this.Cache)
				await this.Cache.terminate( )

			if (this._terminate)
				await this._terminate()

			return OK
		}
	},

	async injectEntity ( object, options = {} ) {
		if (!object.links)
			object.links = {}
		if (!object.delegate)
			object.delegate = {}

		if ( object.emitTo ) throw BaseErrors.ShouldNotBeImplemented( { function: 'emitTo' } )
		object.emitTo = async function ( entity, event, ...params ) {
			if (!this.links[entity]) throw BaseErrors.InvalidReference( { type: 'Entity', name: entity } )

			if ( this.links[entity][MASTER_EVENT] )
				this.links[entity][MASTER_EVENT]( event, ...params ).catch( (err) => { options.logger.error(err) } )
			if ( this.links[entity][event] )
				this.links[entity][event]( ...params ).catch( (err) => { options.logger.error(err) } )
			return OK
		}
		if ( object.emit ) throw BaseErrors.ShouldNotBeImplemented( { function: 'emit' } )
		object.emit = async function ( event, ...params ) {
			if ( this[event] )
				this[event]( ...params ).catch( (err) => { options.logger.error(err) } )
			if ( this[MASTER_EVENT] )
				this[MASTER_EVENT]( [event, ...params] ).catch( (err) => { options.logger.error(err) } )

			for (let entity in this.links) {
				if ( this.links[entity][MASTER_EVENT] )
					this.links[entity][MASTER_EVENT]( [event, ...params] ).catch( (err) => { options.logger.error(err) } )
				if ( this.links[entity][event] )
					this.links[entity][event]( params ).catch( (err) => { options.logger.error(err) } )
			}
			return OK
		}

		if ( object.collect ) throw BaseErrors.ShouldNotBeImplemented( { function: 'collect' } )
		object.collect = async function ( entities, event, ...params ) {
			let self = this
			entities = entities === ANY ? Object.keys( this.links ) : (Array.isArray(entities) ? entities : [entities] )
			return Promise.all( (entities).map( (entity) => {
				return self.links[entity] && self.links[entity][event] ? self.links[entity][event]( ...params ) : { [entity]: 'NA' }
			} ) )
		}

		return object
	},



	async initiateDarcon ( entity, options = {} ) {
		if (!options.mortar) options.mortar = {}

		let darcon = new Darcon( )

		await darcon.init( {
			name: options.division,

			idLength: process.env.PF_ID_LENGTH ? Number(process.env.PF_ID_LENGTH) : 16,

			logger: options.logger,

			reponseTolerance: options.reponseTolerance || 30000,

			reporterInterval: options.reporterInterval || 2000,
			keeperInterval: options.keeperInterval || 10000,

			maxReconnectAttempts: options.maxReconnectAttempts || -1,
			reconnectTimeWait: options.reconnectTimeWait || 250,
			connectTimeWait: options.connectTimeWait || 2500,
			connectionPatience: options.connectionPatience || -1,

			strict: !!options.strict,

			commSize: options.commSize || 1000000 / 2,
			maxCommSize: options.maxCommSize || 5000000 / 2,

			nats: { url: process.env.NATS_URL || options.url || 'nats://localhost:4222' },


			async entityUpdated ( dc, name, terms = {} ) {
				if ( name === entity.name ) return OK

				if ( !entity.links[name] ) return OK

				if (entity.entityUpdated) entity.entityUpdated( name, terms ).catch( (err) => { options.logger.error(err) } )

				if (options.syncServices)
					await options.syncServices(dc, entity, name)

				return OK
			},


			async entityDisappeared ( dc, name ) {
				if ( name === entity.name ) return OK

				// delete entity.links[name]
				if (entity.entityDisappeared) entity.entityDisappeared( name ).catch( (err) => { options.logger.error(err) } )

				return OK
			},

			async entityAppeared ( dc, name ) {
				if ( name === entity.name ) return OK

				if (entity.entityAppeared) entity.entityAppeared( name ).catch( (err) => { options.logger.error(err) } )

				if ( entity.links[name] ) return OK

				console.log( `Entity ${name} appeared at: ${entity.name}` )

				entity.links[name] = {}

				await syncServices(dc, entity, name)

				entity.links[name]._linked = true

				if (entity.entityLinked)
					await entity.entityLinked(name)

				return OK
			},

			mortar: {
				enabled: !!options.mortar.enabled,
				folder: path.join( process.cwd(), 'bus' ),
				liveReload: !!options.mortar.liveReload
			},

			millieu: options.millieu || {}
		} )

		return darcon
	},


	async publishToDarcon ( Darcon, entity, options = {} ) {
		let name = entity.name || options.name

		if (!name)
			throw BaseErrors.DataMissing( { name: 'name' } )

		let Entity = {
			async init ( ) {
				if ( entity.postInit )
					await entity.postInit()
				return OK
			},
			async close ( ) {
				if (entity.terminate)
					await entity.terminate( )
				if (entity.close)
					await entity.close( )
				return OK
			}
		}
		Entity.name = name

		async function syncServices () {
			let services = []
			try { services = await entity.services() }
			catch (err) { services = functions( entity ) }
			services = services.filter( (fnName) => { return !FUNCTIONS_TO_BE_IGNORED.includes( fnName ) && !fnName.startsWith( SEPARATOR ) } )
			for (let fnName of services) {
				Entity[ fnName ] = async function ( ...params ) {
					return entity[fnName]( ...params )
				}
			}
		}

		Object.assign( entity, {
			async _proclaim ( event, terms = {} ) {
				await Darcon.proclaim( entity.name, event, terms )

				return OK
			},
			async _servicesUpdated ( terms = {} ) {
				await syncServices()

				await Darcon.proclaim( entity.name, 'entityUpdated', terms )

				return OK
			},
			async whisper (message, params, terms = {}) {
				return Entity.whisper( message, params, terms )
			}
		} )

		let cp = require( './ClosedPlugin' ).newClosedPlugin()
		for ( let name in cp )
			if ( !entity[name] )
				entity[ name ] = cp[ name ]

		await syncServices()

		await Darcon.publish( Entity, options )

		return Entity
	},



	async prepareAndPublish ( Darcon, entity, options = {} ) {
		if (entity.dependsOn) {
			let depends = await entity.dependsOn()

			while ( depends.length > 0 && !Darcon.finalised ) {
				console.log( `\n------------- ${entity.name} is waiting for [ ${depends} ] to present -------------\n` )

				let data = entity.links // Darcon.presences
				let entities = data ? Object.keys( data ) : []
				depends = depends.filter( (dep) => { return !entities.includes( dep ) || !data[ dep ]._linked } )

				await Proback.timeout( 2000 )
			}
			if (Darcon.finalised) process.exit( -1 )

			console.log( `\n------------- ${entity.name} has all required entities -------------\n` )
		}

		if ( entity.delayStart > 0 )
			await Proback.timeout( entity.delayStart )

		entity.emitTask = async function ( entity, message, delegateEntity, delegateMessage, delegateErrorMessage, params, terms = {} ) {
			if ( !this.links[entity] || !this.links[entity][message] ) throw BaseErrors.UnknownEntity( { entity, message } )

			let flowID = terms && terms.flowID ? terms.flowID : newUID()
			let processID = terms && terms.processID ? terms.processID : newUID()
			return Darcon.delegate( flowID, processID, entity, message, delegateEntity, delegateMessage, delegateErrorMessage, params, terms )
		}

		let darconEntity = await Services.publishToDarcon( Darcon, entity, options )
		entity._inflicted = true

		return darconEntity
	},

	async initiateServer (serverConf, config = {}, context = {} ) {
		let dcfg = require( '../server/DefaultConfig' )
		let cfg = Object.assign( { context }, dcfg, serverConf, config )
		if (serverConf.fastify) cfg.fastify = serverConf.fastify

		let server = new Server()
		await server.init( cfg )

		return server
	}

}

module.exports = Services
