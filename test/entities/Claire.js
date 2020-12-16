const { thrower } = require("proback.js")

module.exports = {
	name: 'Claire',
	version: '2.0.0',
	async transact (from, to, asset, amount, date, terms = {}) {
		console.log('----- Transacting:: ', from, to, asset, amount, date)
		await terms.request( 'Aude', 'account', [ from, to, asset, amount, date ] )
		return { performed: true }
	}
}
