let Clerobee = require('clerobee')
let clerobee = new Clerobee( 32 )
const _ = require( 'isa.js' )

let { MODE_REQUEST } = require( '../models/Packet' )

function extractRequest ( request, options = {} ) {
	let newRequest = _.pick(request, ['headers', 'body', 'query', 'params', 'packet'])
	newRequest.remoteAddress = request.raw.ip
	newRequest.hostname = request.raw.hostname
	newRequest.url = request.raw.url

	if ( options.extractRequest )
		options.extractRequest( request )
	for (let attribute of options.attributesRespected ) {
		newRequest[ attribute ] = request[ attribute ]
	}
	return newRequest
}

module.exports = {
	rester ( Darcon, fastify, options = {}, fastifyConfig = {} ) {
		let prefix = fastifyConfig.apiPrefix || ''
		if ( options.standard ) {
			fastify.post( prefix + '/:division/:entity/:message', fastifyConfig.preValidation ? fastifyConfig.preValidation( fastify, '/:division/:entity/:message' ) : {}, async function (request, reply) {
				let newRequest = extractRequest( request, options )
				let content = newRequest.packet || newRequest.body

				let ps = newRequest.params
				try {
					let res = await Darcon.comm( ps.mode || MODE_REQUEST, ps.flowID, ps.processID, ps.entity, ps.message, ...(Array.isArray( content ) ? content : content.params || []) )
					if ( options.gatekeeper && options.gatekeeper[ ps.message ] )
						await options.gatekeeper[ ps.message ]( res )
					return res
				} catch (err) {
					throw err
				}
			} )
		}

		if ( options.darcon ) {
			fastify.post( prefix + options.darcon, fastifyConfig.preValidation ? fastifyConfig.preValidation( fastify, '/:division/:entity/:message' ) : {}, async function (request, reply) {
				let newRequest = extractRequest( request, options )
				let content = newRequest.packet || newRequest.body

				if ( content.division !== Darcon.name )
					throw new Error('Invalid request')

				if (!content || !content.entity || !content.message)
					throw new Error('Invalid request')

				try {
					let res = await Darcon.comm( content.mode || MODE_REQUEST, content.flowID, content.processID, content.entity, content.message, ...Array.isArray( content ) ? content : content.params )
					if ( options.gatekeeper && options.gatekeeper[ content.message ] )
						await options.gatekeeper[ content.message ]( res )

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
			let res = await Darcon.comm( data.mode || MODE_REQUEST, data.flowID, data.processID, data.entity, data.message, ...data.params )
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
}
