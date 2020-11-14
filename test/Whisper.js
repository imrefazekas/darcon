let config = require('../config')
let Darconer = require( '../Darconer' )

let DarconA = new Darconer()
let DarconB = new Darconer()

const Proback = require( 'proback.js' )
const path = require( 'path' )

let WitchA, WitchB

async function start () {
	config.entityAppeared = async function (Darcon, name, nodeID) {
	}
	config.mortar = {
		enabled: true,
		folder: path.join( __dirname, 'bus' )
	}
	config.logger = {
		debug () { console.log( arguments ) },
		warn () { },
		trace (obj) { },
		info () { },
		error () { },
		darconlog () { }
	}
	await DarconA.init( config )
	await DarconB.init( config )

	WitchA = {
		name: 'Witch',
		version: '1.0.0',
		async murmuring (message) {
			console.log('Murmiring:', message)
			return 'OK'
		}
	}
	await DarconA.publish( WitchA )

	WitchB = {
		name: 'Witch',
		version: '1.0.0',
		async murmuring (message) {
			console.log('Murmiring:', message)
			return 'OK'
		}
	}
	await DarconB.publish( WitchB )
}

async function comm () {
	console.log( await WitchA.whisper( 'murmuring', [ 'Wow' ] ) )

	await Proback.timeout( 1000 )

	return 'OK'
}

async function close () {
	await DarconA.close()
	await DarconB.close()
}

start().then( () => {
	return Proback.timeout( 5000 )
} ).then( () => {
	console.log('Comming...')
	return comm( )
} ).then( (response) => {
	console.log('>>>>>>>', response)
	return Proback.timeout( 3000 )
} ).then( () => {
	return close()
} ).catch( console.error )
