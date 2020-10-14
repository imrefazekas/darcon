let NATS = require('nats')

const _ = require( 'isa.js' )

const Clerobee = require( 'clerobee' )

const Assigner = require( 'assign.js' )
let assigner = new Assigner()

const fs = require('fs')
const path = require('path')
let VERSION = exports.VERSION = JSON.parse( fs.readFileSync( path.join( __dirname, 'package.json'), 'utf8' ) ).version

let { MODE_REQUEST, MODE_INFORM, MODE_DELEGATE, CommPacketer, CommPresencer } = require( './models/Packet' )

let { BaseErrors, ErrorCreator } = require( './util/Errors' )

const HIDDEN_SERVICES_PREFIX = '_'
const SERVICES_REPORTS = 'darcon_service_reports'
const UNDEFINED = 'ToBeFilled'
const SEPARATOR = '_'
const GATER = 'Gater'

const OK = 'OK'

let { Configurator } = require( './models/Configuration' )
let { defined } = require( './util/Helper' )

let PinoLogger = require('./PinoLogger')


function chunkString (str, size) {
	const numChunks = Math.ceil(str.length / size)
	const chunks = new Array(numChunks)

	for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
		chunks[i] = str.substr(o, size)
	}

	return chunks
}

function Darcon () {}

Object.assign( Darcon.prototype, {
	name: UNDEFINED,
	nodeID: UNDEFINED,

	_randomNodeID ( entity ) {
		if ( this.ins && this.ins[ entity ] ) return this.nodeID

		if ( !this.presences || !this.presences[ entity ] ) {
			throw BaseErrors.NoSuchEntity( { entity } )
		}

		let ids = Object.keys( this.presences[ entity ] )
		if ( ids.length === 0 ) throw BaseErrors.NoSuchEntity( { entity } )

		let id = ids[ Math.floor( Math.random( ) * ids.length ) ]
		return id
	},
	async init (config = {}) { let self = this
		this.name = config.name || 'Daconer'
		config.logger = config.logger || PinoLogger( this.name, { level: this.logLevel, prettyPrint: process.env.DARCON_LOG_PRETTY || false } )

		config = await Configurator.derive( config )
		assigner.assign( self, config )

		this.clerobee = new Clerobee( this.idLength )
		this.nodeID = this.clerobee.generate( ),

		this.presences = {}
		this.messages = {}
		this.ins = {}
		this.ins[ SERVICES_REPORTS ] = {
			name: SERVICES_REPORTS,
			entity: { name: SERVICES_REPORTS }
		}
		this.chunks = {}

		await this.connect( )

		this.reporter = setInterval( () => { self.reportStatus() }, this.reporterInterval )
		this.keeper = setInterval( () => { self.checkPresence() }, this.keeperInterval )

		await this.innerCreateIn( SERVICES_REPORTS, '', async function ( message ) {
			try {
				let present = self.strict ? await CommPresencer.derive( JSON.parse( message ) ) : JSON.parse( message )

				if ( !self.presences[ present.entity ] )
					self.presences[ present.entity ] = {}

				if ( self.presences[ present.entity ][ present.nodeID ] ) {
					self.presences[ present.entity ][ present.nodeID ].timestamp = Date.now()
					return OK
				}

				self.presences[ present.entity ][ present.nodeID ] = {
					timestamp: Date.now(), projectVersion: present.projectVersion, entityVersion: present.entityVersion
				}

				if ( self.entityAppeared )
					self.entityAppeared( self, present.entity, present.nodeID ).catch( (err) => { self.logger.darconlog(err) } )
			} catch (err) { self.logger.darconlog( err ) }
		} )

		await this.publish( {
			name: GATER,
			version: VERSION
		} )

		this.Validator = config.Validator
		if ( this.Validator ) {
			if ( _.isString( this.Validator ) ) this.Validator = require( this.Validator )
			self.logger.darconlog( null, 'Validator added...', { name: this.Validator.name, version: this.Validator.version }, 'info' )
		}

		if (config.mortar.enabled) {
			try {
				let Mortar = require( './util/Mortar' )
				self.Mortar = Mortar.newMortar()
				self.logger.darconlog( null, 'Mortar starting...', {}, 'info' )
				await self.publish( self.Mortar, config.mortar )
			} catch (err) { self.logger.darconlog( err ) }
		}
	},

	async _validateMessage (message) {
		if (this.Validator)
			await this.Validator.validateMessage( message )

		return OK
	},

	async processMessage (incoming) {
		let self = this

		if ( defined(incoming.comm.response) || incoming.comm.error ) {
			incoming.comm.receptionDate = Date.now()

			if ( !self.messages[ incoming.uid ] ) return OK
			self.messages[ incoming.uid ].callback(
				incoming.comm.error ? ErrorCreator( {
					errorCode: incoming.comm.error.errorcode,
					errorName: incoming.comm.error.errorName,
					message: incoming.comm.error.message,
					event: incoming.comm.entity + '.' + incoming.comm.message
				} )() : null,
				incoming.comm.error ? null : incoming.comm.response
			)
		}
		else {
			incoming.comm.arrivalDate = Date.now()

			incoming.comm.responderNodeID = self.nodeID
			try {
				if (!self.ins[ incoming.comm.entity ]) throw BaseErrors.NoSuchEntity( { entity: incoming.comm.entity } )
				if (!self.ins[ incoming.comm.entity ].entity[ incoming.comm.message ]) throw BaseErrors.NoSuchService( { service: incoming.comm.message, entity: incoming.comm.entity } )

				await self._validateMessage( incoming.comm )

				let terms = incoming.comm.terms || {}
				let paramsToPass = assigner.cloneObject( incoming.comm.params ).concat( [ assigner.assign( {}, terms, {
					flowID: incoming.comm.flowID,
					processID: incoming.comm.processID,
					async request (to, message, params) {
						return self.innercomm(MODE_REQUEST, incoming.comm.flowID, incoming.comm.processID, incoming.comm.entity, self.nodeID, to, message, null, null, params, terms )
					},
					async inform (to, message, params) {
						return self.innercomm(MODE_INFORM, incoming.comm.flowID, incoming.comm.processID, incoming.comm.entity, self.nodeID, to, message, null, null, params, terms )
					},
					async delegate (to, message, delegateEntity, delegateMessage, params) {
						return self.innercomm(MODE_DELEGATE, incoming.comm.flowID, incoming.comm.processID, incoming.comm.entity, self.nodeID, to, message, delegateEntity, delegateMessage, params, terms )
					},
					comm: incoming.comm
				} ) ] )
				let response = await self.ins[ incoming.comm.entity ].entity[ incoming.comm.message ]( ...paramsToPass )
				if (!defined(response)) throw BaseErrors.NoReturnValue( { fn: incoming.comm.message, entity: incoming.comm.entity } )
				incoming.comm.response = response
			} catch (err) {
				self.logger.debug( err )
				incoming.comm.error = { message: err.message || err.toString(), code: err.code || err.errorCode || err.errorcode || '-1', errorName: err.errorName || '' }
			}

			if (incoming.comm.mode === MODE_INFORM) return OK

			if (incoming.comm.mode === MODE_DELEGATE) {
			}
			else {
				let socketName = incoming.comm.source + SEPARATOR + incoming.comm.sourceNodeID
				incoming.comm.responseDate = Date.now()

				self.sendOut( socketName, incoming )
			}

			return OK
		}
	},

	entity (name) {
		return self.ins[ name ]
	},

	async unpublish (name) {
		if ( this.ins[ name ] ) {
			let socketName = name + SEPARATOR + this.nodeID
			this.natsServer.unsubscribe( socketName )
			delete this.ins[ name ]
		}
	},
	async publish (entity, config = {}) {
		let self = this

		let functions = _.functionNames( entity ).filter( (fnName) => { return !fnName.startsWith( HIDDEN_SERVICES_PREFIX ) } )

		entity.Darcon = this

		entity.request = async function (to, message, params, terms) {
			return self.innercomm(MODE_REQUEST, terms.comm.flowID, self.clerobee.generate( ), entity.name, self.nodeID, to, message, null, null, params, terms)
		}
		entity.inform = async function (to, message, params, terms) {
			return self.innercomm(MODE_INFORM, terms.comm.flowID, self.clerobee.generate( ), entity.name, self.nodeID, to, message, null, null, params, terms)
		}
		entity.delegate = async function (to, message, delegateEntity, delegateMessage, params, terms) {
			return self.innercomm(MODE_DELEGATE, terms.comm.flowID, self.clerobee.generate( ), entity.name, self.nodeID, to, message, delegateEntity, delegateMessage, params, terms)
		}

		let cfg = assigner.assign( { logger: self.logger }, config, this.entities[ entity.name ] || {}, config.millieu || {} )
		if (entity.init)
			await entity.init( cfg )

		await self.innerCreateIn( entity.name, self.nodeID, async function ( message ) {
			try {
				let incoming = self.strict ? await CommPacketer.derive( JSON.parse( message ) ) : JSON.parse( message )
				if ( incoming.chunk && incoming.chunk.no > 0 ) {
					if (!self.chunks[ incoming.uid ]) self.chunks[ incoming.uid ] = []
					self.chunks[ incoming.uid ].push( incoming.chunk.data )
					if ( self.chunks[ incoming.uid ].length === incoming.chunk.of ) {
						let packaet = self.chunks[ incoming.uid ].sort( (a, b) => { return a.of < b.of } ).reduce( (a, b) => { return a.concat(b) } )
						let chLength = self.chunks[ incoming.uid ]
						delete self.chunks[ incoming.uid ]

						let realPacket = JSON.parse( packaet )
						self.logger[ self.logLevel ]( { darcon: self.name, nodeID: self.nodeID, uid: realPacket.uid, flowID: realPacket.comm.flowID, processID: realPacket.comm.processID, received: { chunks: chLength } } )
						self.processMessage( realPacket ).catch( (err) => { self.logger.darconlog( err ) } )
					}
				}
				else {
					self.logger[ self.logLevel ]( { darcon: self.name, nodeID: self.nodeID, uid: incoming.uid, flowID: incoming.comm.flowID, processID: incoming.comm.processID, received: incoming } )
					self.processMessage( incoming ).catch( (err) => { self.logger.darconlog( err ) } )
				}
			} catch (err) {
				self.logger.darconlog( err )
			}
		} )


		if ( !self.ins[ entity.name ] )
			self.ins[ entity.name ] = {
				name: entity.name,
				version: entity.version || entity.VERSION || '1.0.0',
				services: functions,
				entity
			}

	},

	async connect () {
		let self = this

		return new Promise( (resolve, reject) => {
			self.logger.darconlog( null, 'Connecting to NATS:', self.nats.url, 'info' )

			try {
				self.natsServer = NATS.connect( self.nats )

				self.natsServer.on('connect', function (nc) {
					self.logger.darconlog( null, 'NATS connection is made', { }, 'warn' )
					resolve( OK )
				})
				self.natsServer.on('error', (err) => {
					self.logger.darconlog( err )
				} )
				self.natsServer.on('close', () => {
					self.logger.darconlog( null, 'NATS connection closed')
				} )
				self.natsServer.on('disconnect', function () {
					self.logger.darconlog( null, 'NATS disconnected')
				})

				self.natsServer.on('reconnecting', function () {
					self.logger.darconlog( null, 'NATS reconnecting...')
					self.resetup().catch( (err) => { self.logger.darconlog(err) } )
				})

				self.natsServer.on('reconnect', function (nc) {
					self.logger.darconlog( null, 'NATS reconnected')
				})

				if ( self.reponseTolerance > 0 ) {
					self.cleaner = setInterval( function () {
						self.cleanupMessages()
					}, self.reponseTolerance )
				}
			} catch (err) { reject(err) }
		} )
	},

	async close () {
		var self = this
		return new Promise( async (resolve, reject) => {
			self.finalised = true

			if (self.reporter)
				clearInterval( self.reporter )
			if (self.keeper)
				clearInterval( self.keeper )
			if (self.cleaner)
				clearInterval( self.cleaner )

			for (let entityRef in self.ins) {
				let entity = self.ins[entityRef].entity
				if (entity.close)
					entity.close().catch( (err) => { self.logger.darconlog(err) } )
			}

			try {
				if ( self.natsServer )
					self.natsServer.close()

				resolve( OK )
			} catch (err) {
				reject(err)
			}
		} )
	},

	async innerCreateIn ( entityName, node, handler ) {
		let self = this

		let socketName = entityName + (node ? SEPARATOR + node : node)
		self.natsServer.subscribe( socketName, (message) => {
			handler(message).catch( (err) => {
				self.logger.darconlog(err) } )
			return OK
		} )

		self.logger.darconlog( null, 'NATS SUBSCRIBE is made.', { socketName, node }, 'info' )
	},

	async cleanupMessages () {
		let self = this

		let time = Date.now()
		for ( let key of Object.keys( self.messages ) ) {
			if ( time - self.messages[key].timestamp > self.reponseTolerance ) {
				let callbackFn = self.messages[key].callback
				let entity = self.messages[key].entity
				let message = self.messages[key].message
				delete self.messages[ key ]
				delete self.chunks[ key ]
				callbackFn( BaseErrors.RequestTimeout( { entity, message, tolerance: self.reponseTolerance } ) )
			}
		}
	},

	async reportStatus () {
		let self = this

		try {
			for (let name in this.ins) {
				if (name === SERVICES_REPORTS || name === GATER) continue

				let entity = this.ins[ name ]
				let report = {
					entity: entity.name,
					nodeID: self.nodeID,
					entityVersion: entity.version,
					projectVersion: VERSION
				}
				self.natsServer.publish( SERVICES_REPORTS, self.strict ? JSON.stringify( await CommPresencer.derive( report ) ) : JSON.stringify( report ) )
			}
		} catch ( err ) { self.logger.darconlog( err ) }
	},

	async resetup ( ) {
		let self = this

		for ( let ref of Object.keys(self.ins) )
			await this.publish( self.ins[ref].entity )

		return OK
	},

	async checkPresence () {
		let self = this

		let timestamp = Date.now()
		Object.keys(self.presences).forEach( function (entity) {
			Object.keys(self.presences[entity]).forEach( function (node) {
				if ( self.presences[entity][node].timestamp <= timestamp - self.keeperInterval )
					delete self.presences[entity][node]
			} )

			if ( Object.keys( self.presences[entity] ).length === 0 )
				if ( self.entityDisappeared )
					self.entityDisappeared( self, entity ).catch( (err) => { self.logger.darconlog(err) } )
		} )
	},

	async sendOut ( socketName, packet ) {
		let packetString = this.strict ? JSON.stringify( await CommPacketer.derive( packet ) ) : JSON.stringify( packet )

		if ( packetString.length >= this.maxCommSize )
			throw BaseErrors.PacketExceeded( { limit: this.maxCommSize } )

		if ( packetString.length < this.commSize ) {
			this.natsServer.publish( socketName, packetString )
			this.logger[ this.logLevel ]( { darcon: this.name, nodeID: this.nodeID, packet: packet.uid, flowID: packet.comm.flowID, processID: packet.comm.processID, sent: packet } )
		}
		else {
			let chunks = chunkString( packetString, this.commSize )
			for ( let i = 0; i < chunks.length; ++i ) {
				let newPacket = { uid: packet.uid, chunk: { no: i + 1, of: chunks.length, data: chunks[ i ] } }
				this.natsServer.publish( socketName, this.strict ? JSON.stringify( await CommPacketer.derive( newPacket ) ) : JSON.stringify( newPacket ) )
			}
			this.logger[ this.logLevel ]( { darcon: this.name, nodeID: this.nodeID, packet: packet.uid, flowID: packet.comm.flowID, processID: packet.comm.processID, sent: { chunks: chunks.length } } )
		}
	},

	async innercomm (mode, flowID, processID, source, sourceNodeID, entity, message, delegateEntity, delegateMessage, params, terms = {}) {
		let self = this

		if (mode === MODE_DELEGATE && (!delegateEntity || !delegateMessage) )
			throw BaseErrors.DelegationRequired( { mode: MODE_DELEGATE } )

		let nodeID = this._randomNodeID( entity )
		let socketName = entity + SEPARATOR + nodeID

		let uid = self.clerobee.generate( )
		let packet = {
			uid,
			comm: {
				mode,

				uid,

				flowID: flowID || self.clerobee.generate(),
				processID: processID || self.clerobee.generate(),

				creationDate: Date.now(),

				source,
				sourceNodeID,

				entity,
				message,
				delegateEntity, delegateMessage,

				params: params || [],

				terms: terms || {}
			}
		}

		return new Promise( (resolve, reject) => {
			let callback = function ( err, res ) {
				delete self.messages[ packet.uid ]
				if (err) return reject(err)
				resolve(res)
			}
			self.messages[ packet.uid ] = {
				timestamp: Date.now(),
				callback,
				entity: packet.comm.entity,
				message: packet.comm.message
			}
			packet.comm.dispatchDate = Date.now()

			self.sendOut( socketName, packet ).catch( (err) => {
				self.logger.darconlog(err)
				reject(err)
			} )

			return OK

		} )
	},

	async comm (mode, flowID, processID, entity, message, params, terms) {
		return this.innercomm(mode, flowID, processID, GATER, this.nodeID, entity, message, null, null, params, terms)
	},

	async inform (flowID, entity, message, params, terms) {
		return this.innercomm(MODE_INFORM, flowID, '', GATER, this.nodeID, entity, message, null, null, params, terms)
	},
	async delegate (flowID, entity, message, params, terms) {
		return this.innercomm(MODE_DELEGATE, flowID, '', GATER, this.nodeID, entity, message, null, null, params, terms)
	},
	async request (flowID, entity, message, params, terms) {
		return this.innercomm(MODE_REQUEST, flowID, '', GATER, this.nodeID, entity, message, null, null, params, terms)
	}

} )

module.exports = Darcon
