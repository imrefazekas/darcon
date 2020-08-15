let { addProto, addPrimus, newQuanstructor, quanstructor } = require('quanstructor')

const Assigner = require( 'assign.js' )
let assigner = new Assigner()

module.exports = {
	addProto, addPrimus, newQuanstructor, quanstructor,

	VALIDATION_FUNC: { required: true, typeof: Function },
	VALIDATION_REQ: { required: true },
	VALIDATION_ARR: { _outer: { required: true, typeof: Array } },
	VALIDATION_OBJ: { required: true, typeof: Object },
	VALIDATION_BOOL: { required: true, typeof: Boolean },
	VALIDATION_STR: { required: true, typeof: String },
	VALIDATION_NUM: { required: true, typeof: Number },
	VALIDATION_NAME: { required: true, minlength: 2, typeof: String },
	VALIDATION_UID: { required: true, minlength: 8, typeof: 'alphanum' },

	NOREQ (validation = {}) {
		let v = assigner.assign( {}, validation )
		v.required = false
		return v
	}
}
