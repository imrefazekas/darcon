
let config = require('../config')
config.nats.url = 'nats://aa1201276d68c4edaae73dca50e36d51-1193483644.eu-central-1.elb.amazonaws.com:4222'
config.reponseTolerance = 10000


let Darconer = require( '../Darconer' )
let Darcon = new Darconer()

let { MODE_REQUEST, MODE_INFORM, MODE_DELEGATE } = require( '../models/Packet' )

const Clerobee = require( 'clerobee' )
let clerobee = new Clerobee()

const Proback = require( 'proback.js' )
const path = require( 'path' )


async function start () {
	config.entityAppeared = async function (Darcon, name, nodeID) {
	}
	config.mortar = {
		enabled: true,
		folder: path.join( __dirname, 'entities' )
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
}

const duration = 60 * 1000
const CPS = 60
const RQS = 1000

let success = 0, sum = 0, time
async function comm () {
	time = Date.now()

	do {
		sum++
		console.log('>>>> Cycle:: ' + sum)

		setTimeout( async () => {
			for (let i = 0; i < RQS; ++i) {
				Darcon.comm( MODE_REQUEST, '', '', 'Claire', 'transact', [ 'Steve', 'Bob', 'EUR', Math.random() * 1000000 + 1000 + i, Date.now() ], { data: 'huhhh' } ).then( () => {
					success++
				} ).catch( console.error )
				await Proback.timeout( 10 )
			}
		}, 0 )

		await Proback.timeout( Math.floor(60 / CPS * 1000 + 1) )
	} while( Date.now() - time <  duration )

	time = Date.now() - time

	return 'OK'
}

async function close () {
	return Darcon.close()
}

start().then( () => {
	return Proback.timeout( 5000 )
} ).then( () => {
	return comm( )
} ).then( (response) => {
	return Proback.timeout( 2000 )
} ).then( () => {
	console.log( `>>>>>>>>>>>> ${success} / ${sum} in ${time}` )
	return close()
} ).catch( console.error )
