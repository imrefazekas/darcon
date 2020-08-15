let pino = require('pino')

module.exports = function ( name, options ) {
	options = options || {}
	let logger = pino({
		name: name,
		prettyPrint: !!options.prettyPrint,
		level: options.level || 'info',
		serializers: {
			req: pino.stdSerializers.req,
			res: pino.stdSerializers.res
		}
	})

	logger.darconlog = function ( err, message, obj, level ) {
		if (err)
			this[ 'error' ]( err, err.message || err.toString() )
		else
			this[ level || 'debug' ]( obj || { }, message )
	}.bind( logger )

	return logger
}
