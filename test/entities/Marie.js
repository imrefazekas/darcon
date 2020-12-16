
module.exports = {
	name: 'Marie',
	version: '2.0.0',
	async storno (transactionID) {
		console.log('----- Storno:: ', transactionID)
		return { performed: true }
	}
}
