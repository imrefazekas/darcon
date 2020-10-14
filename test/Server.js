let config = require('../config')
let Darconer = require( '../Darconer' )
let Darcon = new Darconer()
let ServerProto = require( '../server/Server' )
let Server = new ServerProto()

let { MODE_REQUEST, MODE_INFORM, MODE_DELEGATE } = require( '../models/Packet' )

const Clerobee = require( 'clerobee' )
let clerobee = new Clerobee()

const Proback = require( 'proback.js' )

const request = require('request')
const WebSocket = require('ws')
let socketClient

let logger = {
	debug () {},
	warn () {},
	trace () {},
	info () { console.log( arguments ) },
	error () {},
	darconlog () {}
}

async function post ( uri, body ) {
	return new Promise( (resolve, reject) => {
		request( {
			method: 'POST',
			uri: uri,
			json: true,
			body: body
		}, function (error, response, body) {
			if (error) return reject( error )
			resolve( { response: response, body: body } )
		} )
	} )
}

const DIVISION = 'DIVISION'

async function darconer () {
	config.logger = logger
	config.name = DIVISION
	await Darcon.init( config )

	await Darcon.publish(
		{
			name: 'Marie',
			version: '2.0.0',
			async echo (...params) {
				console.log('!!!!!!!!!!!!!!!!!!!!', params)
				let terms = params[ params.length - 1 ]
				return params.slice(0, -1).concat( await terms.request( 'Claire', 'extend', ['Wow'] ) ).concat( await this.request( 'Claire', 'extend', ['Awesome'], terms ) )
			}
		}
	)
	await Darcon.publish(
		{
			name: 'Claire',
			version: '2.0.0',
			async extend (...params) {
				return params.slice(0, -1)
			}
		}
	)
}

async function server () {
	let config = require( '../server/DefaultConfig' )
	config.Darconer = Darcon
	config.logger = logger
	await Server.init( config )


	socketClient = new WebSocket('ws://localhost:8080//DarconWS')
	socketClient.on('open', function open () {
		console.log('Connected to /DarconWS Socket')
	})
	socketClient.on('message', function incoming (data) {
		data = JSON.parse( data )
		if ( data.state )
			console.log('MOOOOOOODD >>>>>>>>>>>>>> ', data)
	})
}

async function comm () {
	post( 'http://localhost:8080/DarconRPC', { division: DIVISION, entity: 'Marie', message: 'echo', params: [ 'Hello' ] } ).then( (res) => {
		console.log( res.response.statusCode, res.response.statusMessage, res.body )
	} ) .catch( console.error )

	post( 'http://localhost:8080/' + DIVISION + '/Marie/echo', { params: [ 'Hello' ] } ).then( (res) => {
		console.log( res.response.statusCode, res.response.statusMessage, res.body )
	} ) .catch( console.error )


	socketClient.send( JSON.stringify( { id: clerobee.generate(), division: DIVISION, entity: 'Marie', message: 'echo', params: [ 'Bonjour!', 'Salut!' ] } ) )
	socketClient.on('message', function (data) {
		data = JSON.parse( data )
		console.log( '!!!!!!', data )
	} )
}

async function close () {
	await Server.close()
	return Darcon.close()
}

darconer().then( () => {
	return server()
} ).then( () => {
	return Proback.timeout( 3000 )
} ).then( () => {
	return comm( )
} ).then( (response) => {
	return Proback.timeout( 3000 )
} ).then( () => {
	return close()
} ).catch( console.error )
