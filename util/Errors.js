const { inherits } = require('util')

let Assigner = require('assign.js')
let assigner = new Assigner()

let _ = require('isa.js')

let DarconError = function (message, errorName, errorCode) {
	this.message = message
	this.errorName = errorName
	this.errorCode = errorCode
	Error.captureStackTrace(this, DarconError)
}
inherits(DarconError, Error)

function templating (string, ...parameters) {
	let options = parameters.length === 1 && _.isObject( parameters[0] ) ? parameters[0] : parameters

	return string.replace(/\{([0-9a-zA-Z_]+)\}/g, (match, i, index) => {
		if (string[index - 1] === '{' &&
			string[index + match.length] === '}') {
			return i
		} else {
			return options.hasOwnProperty(i) && options[i] ? options[i] : ''
		}
	})
}

let ErrorCreator = function (options = {}) {
	let errorCode = options.errorCode
	let args = assigner.assign({}, options)
	delete args['message']
	delete args['code']
	delete args['errorCode']
	let fnc = function (opts = {}) {
		let newArgs = assigner.assign({}, args, opts)
		let message = templating(options.message, newArgs)
		let resultError = new DarconError(message, options.errorName || errorCode, errorCode)
		resultError.params = newArgs
		return resultError
	}
	return fnc
}

let BaseErrors = {


	NoReturnValue: ErrorCreator( {
		errorCode: 66000,
		errorName: 'NoReturnValue',
		message: 'Function {fn} in {entity} returned without a value'
	} ),

	PacketExceeded: ErrorCreator( {
		errorCode: 66001,
		errorName: 'PacketExceeded',
		message: 'The packet is exceeded the {limit}'
	} ),

	DelegationRequired: ErrorCreator( {
		errorCode: 66002,
		errorName: 'DelegationRequired',
		message: 'Delegation attributes must be set when mode is {mode}'
	} ),

	NoSuchEntity: ErrorCreator( {
		errorCode: 66003,
		errorName: 'NoSuchEntity',
		message: 'No {entity} is present'
	} ),

	NoSuchService: ErrorCreator( {
		errorCode: 66004,
		errorName: 'NoSuchService',
		message: 'No {service} is present at {entity}'
	} )

}

module.exports = { DarconError, ErrorCreator, BaseErrors }
