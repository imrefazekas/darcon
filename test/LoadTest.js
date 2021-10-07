
let config = require('../config')
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

const duration = process.env.DURATION ? Number(process.env.DURATION) : 60 * 1000
const CPS = process.env.CPS ? Number(process.env.CPS) : 60
const RQS = process.env.RQS ? Number(process.env.RQS) : 1000

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
