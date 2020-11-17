const _ = require( 'isa.js' )

let { MODE_REQUEST } = require( '../models/Packet' )

function extractRequest ( request, options = {} ) {
	let newRequest = _.pick(request, ['headers', 'body', 'query', 'params', 'packet'])
	newRequest.remoteAddress = request.remoteAddress || request.connection.remoteAddress || request.socket.remoteAddress || request.headers['x-forwarded-for'] || ''

	if ( options.extractRequest )
		options.extractRequest( request )
	for (let attribute of options.attributesRespected ) {
		newRequest[ attribute ] = request[ attribute ]
	}
	return newRequest
}

function Radiator () {}
Object.assign( Radiator.prototype, {
	rester ( Darcon, fastify, options = {}, fastifyConfig = {} ) {
		let prefix = fastifyConfig.apiPrefix || ''
		if ( options.standard ) {
			fastify.post( prefix + '/:division/:entity/:message', fastifyConfig.preValidation ? fastifyConfig.preValidation( fastify ) : {}, async function (request, reply) {
				if ( request.params.division !== Darcon.name )
					throw new Error('Invalid request')

				let newRequest = extractRequest( request, options )
				let content = newRequest.packet || newRequest.body
				let parameters = Array.isArray( content ) ? content : (content.params || [])

				let terms = _.pick( request, options.attributesToPass || [] )

				let ps = newRequest.params
				terms.flowID = ps.flowID
				terms.processID = ps.processID

				try {
					if ( options.gatekeeper )
						await options.gatekeeper( request, ps.flowID, ps.processID, ps.entity, ps.message, parameters )

					let res = await Darcon.comm( ps.mode || MODE_REQUEST, ps.flowID, ps.processID, ps.entity, ps.message, parameters, terms )

					if ( options.conformer )
						await options.conformer( request, ps.flowID, ps.processID, ps.entity, ps.message, res )

					return res
				} catch (err) {
					throw err
				}
			} )
		}

		if ( options.darcon ) {
			fastify.post( prefix + options.darcon, fastifyConfig.preValidation ? fastifyConfig.preValidation( fastify ) : {}, async function (request, reply) {
				let newRequest = extractRequest( request, options )
				let content = newRequest.packet || newRequest.body

				if ( content.division !== Darcon.name )
					throw new Error('Invalid request')

				if (!content || !content.entity || !content.message)
					throw new Error('Invalid request')

				let parameters = Array.isArray( content ) ? content : (content.params || [])

				let terms = _.pick( request, options.attributesToPass || [] )

				try {
					if ( options.gatekeeper )
						await options.gatekeeper( request, content.flowID, content.processID, content.entity, content.message, parameters )

					let res = await Darcon.comm( content.mode || MODE_REQUEST, content.flowID, content.processID, content.entity, content.message, parameters, terms )

					if ( options.conformer )
						await options.conformer( request, content.flowID, content.processID, content.entity, content.message, res )

					return res
				} catch (err) {
					reply.code( err.message.startsWith( 'Nobody is listening to' ) ? 503 : 500 )
					throw err
				}
			} )
		}
	},

	ws ( Darcon, fastify, options = {}, fastifyConfig = {} ) {
		if (!options.darcon) return

		async function processSocketData (socket, data) {
			if (fastifyConfig.wsPreprocess) await fastifyConfig.wsPreprocess( socket, data )
			let res = await Darcon.comm( data.mode || MODE_REQUEST, data.flowID, data.processID, data.entity, data.message, data.params, data.terms )
			socket.send( JSON.stringify( { id: data.id, result: res } ) )
		}

		function handle (conn) {
			conn.socket.on('message', (data) => {
				try {
					if ( _.isString(data) )
						data = JSON.parse( data )
				} catch (err) { throw err }
				return processSocketData( conn.socket, data ).catch( (err) => {
					options.logger.error( err )
					conn.socket.send( JSON.stringify( { id: data.id, error: err.message } ) )
				} )
			} )
			// conn.pipe(conn) // creates an echo server
		}

		fastify.register(require('fastify-websocket'), {
			handle,
			options: { maxPayload: 1048576, noServer: true }
		})
	}
} )

module.exports = Radiator
