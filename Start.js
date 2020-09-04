let config = require('./config')

async function start () {
	let Darconer = require( './Darconer' )
	let Darcon = new Darconer()
	await Darcon.init( config )

	return Darcon.publish(
		{
			name: 'Marie',
			version: '2.0.0',
			async echo (...params) { return params }
		}
	)
}

start().catch( console.error )
