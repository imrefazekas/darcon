const fs = require('fs')
const path = require('path')
let VERSION = exports.VERSION = JSON.parse( fs.readFileSync( path.join( process.cwd(), 'package.json'), 'utf8' ) ).version

let { newQuanstructor, VALIDATION_STR, VALIDATION_NUM, VALIDATION_OBJ, VALIDATION_ARR, NOREQ } = require('./Devise')

const MODE_REQUEST = 1
const MODE_INFORM = 2
const MODE_DELEGATE = 3

newQuanstructor( 'DarComm', {
	mode: { default: MODE_REQUEST, validation: { required: true, element: [ MODE_REQUEST, MODE_INFORM, MODE_DELEGATE ] } },

	uid: { validation: VALIDATION_STR },
	flowID: { default: '', validation: VALIDATION_STR },
	processID: { default: '', validation: VALIDATION_STR },

	dispatchDate: { default: -1, validation: VALIDATION_NUM },
	arrivalDate: { default: -1, validation: VALIDATION_NUM },
	responseDate: { default: -1, validation: VALIDATION_NUM },
	receptionDate: { default: -1, validation: VALIDATION_NUM },

	source: { validation: VALIDATION_STR },
	sourceNodeID: { validation: VALIDATION_STR },

	entity: { validation: VALIDATION_STR },
	message: { validation: VALIDATION_STR },

	params: { default: [], validation: VALIDATION_ARR },

	terms: { default: {}, validation: VALIDATION_OBJ },

	delegateEntity: { default: '', validation: VALIDATION_STR },
	delegateMessage: { default: '', validation: VALIDATION_STR },

	responderNodeID: { default: '', validation: VALIDATION_STR },

	error: { default: null, validation: NOREQ( VALIDATION_OBJ ) },
	response: { default: null },

	async _preserve (obj, projection, options) {
		if (obj.mode === MODE_DELEGATE && (!obj.delegateEntity || !obj.delegateMessage) )
			throw new Error( 'Delegation attributes must be set when mode is \'MODE_DELEGATE\'' )

		return obj
	}
} )

let CommPacketer = newQuanstructor( 'CommPacket', {
	uid: { validation: VALIDATION_STR },
	comm: { Quanstructor: 'DarComm' },
	async _preserve (obj, projection, options) {
		obj.uid = obj.comm.uid
		return obj
	}
} )

let CommPresencer = newQuanstructor( 'CommPresencer', {
	entity: { validation: VALIDATION_STR },
	nodeID: { validation: VALIDATION_STR },
	projectVersion: { defult: VERSION, validation: VALIDATION_STR },
	entityVersion: { default: '1.0.0', validation: VALIDATION_STR }
} )

module.exports = {
	MODE_REQUEST,
	MODE_INFORM,
	MODE_DELEGATE,
	CommPacketer,
	CommPresencer
}
