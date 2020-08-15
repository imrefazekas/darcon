let config = require('./config')

async function start () {
	let Darconer = require( './Darconer' )
	await Darconer.init( config )

	return Darconer.publish(
		{
			name: 'Marie',
			version: '2.0.0',
			async echo (...params) { return params }
		}
	)
}

start().catch( console.error )
