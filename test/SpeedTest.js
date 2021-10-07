
let config = require('../config')
config.nats.url = process.env.NATS_URL || 'nats://localhost:4222'
config.reponseTolerance = process.env.RESP_TOLERANCE ? Number(process.env.RESP_TOLERANCE) : 10000


let Darconer = require( '../Darconer' )
let Darcon = new Darconer()

let { MODE_REQUEST, MODE_INFORM, MODE_DELEGATE } = require( '../Models' )

const Clerobee = require( 'clerobee' )
let clerobee = new Clerobee()

const Proback = require( 'proback.js' )
const path = require( 'path' )


async function start () {
	config.entityAppeared = async function (Darcon, name, nodeID) {
	}
	config.mortar = {
		enabled: false
	}
	config.logger = {
		debug () { },
		warn () { },
		trace (obj) { },
		info () { },
		error () { console.error( arguments ) },
		darconlog () { }
	}
	await Darcon.init( config )

	await Darcon.publish( {
		name: 'Claire',
		async greetings () {
			return 'Hello!'
		}
	}, {} )
}

async function comm () {
	console.log('Starts....')

	time = Date.now()

	let ps = []
	for (let i = 0; i < 20000; ++i) {
		ps.push(
			Darcon.comm( MODE_REQUEST, '', '', 'Claire', 'greetings', [ ], { } ).then( console.log ).catch( console.error )
		)
	}

	console.log('???')
	await Promise.all( ps )

	let end = Date.now() - time
	console.log( '...', (end), (20000 / ((end) / 1000) ) )

	return 'OK'
}

async function close () {
	return Darcon.close()
}

start().then( () => {
	return comm( )
} ).then( () => {
	return close()
} ).catch( console.error )
