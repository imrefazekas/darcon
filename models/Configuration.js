let { newQuanstructor, VALIDATION_STR, VALIDATION_NUM, VALIDATION_BOOL, VALIDATION_ARR, VALIDATION_OBJ } = require('./Devise')

newQuanstructor( 'Natser', {
	url: { default: 'nats://localhost:4222', validation: VALIDATION_STR }
} )

let Configurator = newQuanstructor( 'Configurator', {
	idLength: { default: 16, validation: VALIDATION_NUM },

	tolerance: { default: 2000, validation: VALIDATION_NUM },
	reporterInterval: { default: 2000, validation: VALIDATION_NUM },
	keeperInterval: { default: 3000, validation: VALIDATION_NUM },

	maxReconnectAttempts: { default: -1, validation: VALIDATION_NUM },
	reconnectTimeWait: { default: 250, validation: VALIDATION_NUM },

	strict: { default: false, validation: VALIDATION_BOOL },

	commSize: { default: 1000000 / 2, validation: VALIDATION_NUM },
	maxCommSize: { default: 2000000 / 2, validation: VALIDATION_NUM },

	nats: { default: {}, Quanstructor: 'Natser' },

	logger: { validation: VALIDATION_OBJ },

	entityAppeared: { default: null },

	entities: { default: {}, validation: VALIDATION_OBJ },
	millieu: { default: {}, validation: VALIDATION_OBJ }
} )

module.exports = {
	Configurator
}
