const Clerobee = require( 'clerobee' )
let clerobee = new Clerobee()

module.exports = {
	name: 'Aude',
	version: '2.0.0',
	async account (from, to, asset, amount, date, terms = {}) {
		console.log('----- Accounting:: ', from, to, asset, amount, date)
		await terms.request( 'Marie', 'storno', [ clerobee.generate() ] )
		return { performed: true }
	}
}
