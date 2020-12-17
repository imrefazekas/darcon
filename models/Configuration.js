let { newQuanstructor, VALIDATION_STR, VALIDATION_NUM, VALIDATION_BOOL, VALIDATION_OBJ } = require('./Devise')

newQuanstructor( 'Natser', {
	url: { default: 'nats://localhost:4222', validation: VALIDATION_STR }
} )

newQuanstructor( 'Mortar', {
	enabled: { default: false, validation: VALIDATION_BOOL },
	folder: { default: '', validation: VALIDATION_STR },
	liveReload: { default: false, validation: VALIDATION_BOOL },
	liveReloadTimeout: { default: 5000, validation: VALIDATION_NUM },
	pattern: { default: '', validation: VALIDATION_STR }
} )

let Configurator = newQuanstructor( 'Configurator', {
	idLength: { default: 16, validation: VALIDATION_NUM },

	logLevel: { default: process.env.DARCON_LOG_LEVEL || 'debug', validation: VALIDATION_STR },

	reponseTolerance: { default: 5000, validation: VALIDATION_NUM },

	reporterInterval: { default: 5000, validation: VALIDATION_NUM },

	keeperInterval: { default: 15000, validation: VALIDATION_NUM },

	maxReconnectAttempts: { default: -1, validation: VALIDATION_NUM },
	reconnectTimeWait: { default: 250, validation: VALIDATION_NUM },
	connectTimeWait: { default: 2500, validation: VALIDATION_NUM },

	strict: { default: false, validation: VALIDATION_BOOL },

	commSize: { default: 1000000 / 2, validation: VALIDATION_NUM },
	maxCommSize: { default: 2000000 / 2, validation: VALIDATION_NUM },

	nats: { Quanstructor: 'Natser' },

	logger: { validation: VALIDATION_OBJ },

	entityAppeared: { default: null },
	entityDisappeared: { default: null },

	entities: { default: {}, validation: VALIDATION_OBJ },
	millieu: { default: {}, validation: VALIDATION_OBJ },

	mortar: { Quanstructor: 'Mortar' }
} )

module.exports = {
	Configurator
}
