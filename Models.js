const fs = require('fs')
const path = require('path')

const Validator = require('fastest-validator')
const v = new Validator()

const Assigner = require('assign.js')
let assigner = (new Assigner()).recursive( true )

function clone (obj) {
	let res = JSON.parse(JSON.stringify(obj))
	delete res.$$strict
	return res
}

const MODE_REQUEST = 'R'
const MODE_INFORM = 'I'
const MODE_DELEGATE = 'D'


const DEF_MORTAR = {
	$$strict: 'remove',

	enabled: { type: 'boolean', default: false },
	folder: { type: 'string', default: '' },
	liveReload: { type: 'boolean', default: false },
	liveReloadTimeout: { type: 'number', default: 5000 },
	pattern: { type: 'string', default: '' }
}
const PROTO_MORTAR = {}
v.validate(PROTO_MORTAR, DEF_MORTAR)

const DEF_CONFIGURATION = {
	$$strict: 'remove',

	idLength: { type: 'number', default: 16 },

	logLevel: { type: 'string', default: process.env.DARCON_LOG_LEVEL || 'debug' },

	reponseTolerance: { type: 'number', default: 5000 },

	reporterInterval: { type: 'number', default: 5000 },

	keeperInterval: { type: 'number', default: 15000 },

	strict: { type: 'boolean', default: false },

	commSize: { type: 'number', default: 1000000 / 2 },
	maxCommSize: { type: 'number', default: 2000000 / 2 },

	nats: { type: 'object', default: {} },

	logger: { type: 'object' },

	entityAppeared: { type: 'object', default: null },
	entityDisappeared: { type: 'object', default: null },

	entities: { type: 'object', default: {} },
	millieu: { type: 'object', default: {} },

	mortar: {
		type: 'object',
		default: PROTO_MORTAR,
		props: clone(DEF_MORTAR)
	}
}
const PROTO_CONFIGURATION = {}
v.validate(PROTO_CONFIGURATION, DEF_CONFIGURATION)

const DEF_PRESENCER = {
	entity: { type: 'string', default: '' },
	nodeID: { type: 'string', default: '' },
	projectVersion: { type: 'string', default: '1.0.0' },
	entityVersion: { type: 'string', default: '1.0.0' }
}
const PROTO_PRESENCER = {}
v.validate(PROTO_PRESENCER, DEF_PRESENCER)

const DEF_PROCLAIMER = {
	entity: { type: 'string', default: '' },
	nodeID: { type: 'string', default: '' },
	message: { type: 'string', default: '' },
	terms: { type: 'object', default: {} },
}
const PROTO_PROCLAIMER = {}
v.validate(PROTO_PROCLAIMER, DEF_PROCLAIMER)

const DEF_PACKET = {
	mode: { type: 'string', default: MODE_REQUEST, element: [ MODE_REQUEST, MODE_INFORM, MODE_DELEGATE ] },

	uid: { type: 'string', default: '' },
	flowID: { type: 'string', default: '' },
	processID: { type: 'string', default: '' },

	dispatchDate: { type: 'number', default: -1 },
	arrivalDate: { type: 'number', default: -1 },
	responseDate: { type: 'number', default: -1 },
	receptionDate: { type: 'number', default: -1 },

	source: { type: 'string', default: '' },
	sourceNodeID: { type: 'string', default: '' },

	entity: { type: 'string', default: '' },
	message: { type: 'string', default: '' },

	params: { type: 'array', default: [] },

	terms: { type: 'object', default: {} },

	delegateEntity: { type: 'string', default: '' },
	delegateMessage: { type: 'string', default: '' },

	responderNodeID: { type: 'string', default: '' },

	error: { type: 'object', default: null },
	response: { type: 'any', default: null }
}
const PROTO_PACKET = {}
v.validate(PROTO_PACKET, DEF_PACKET)


module.exports = {
	MODE_REQUEST,
	MODE_INFORM,
	MODE_DELEGATE,

	async newPacket (desc = {}) {
		let packet = assigner.assign( clone(PROTO_PACKET), desc )
		if (packet.mode === MODE_DELEGATE && (!packet.delegateEntity || !packet.delegateMessage) )
			throw new Error( 'Delegation attributes must be set when mode is \'MODE_DELEGATE\'' )

		return packet
	},

	async newConfig (desc = {}) {
		return assigner.assign( clone(PROTO_CONFIGURATION), desc )
	},

	async newProclaimer (desc = {}) {
		return assigner.assign( clone(PROTO_PROCLAIMER), desc )
	},

	async newPresencer (desc = {}) {
		return assigner.assign( clone(PROTO_PRESENCER), desc )
	}
}
