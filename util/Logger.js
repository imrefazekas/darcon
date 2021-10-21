function ensureDarconLog(loggerInstance) {
	if(typeof loggerInstance.darconlog !== 'undefined') return loggerInstance
	loggerInstance.darconlog = function ( err, message, obj, level ) {
		if (err)
			this[ 'error' ]( err, err.message || err.toString() )
		else
			this[ level || 'debug' ]( obj || { }, message )
	}.bind( loggerInstance )
	return loggerInstance
}
module.exports = {
	ensureDarconLog
}
