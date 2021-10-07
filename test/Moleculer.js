const {
	ServiceBroker
} = require("moleculer");
const n2Broker = new ServiceBroker({
	nodeID: "n2Broker",
	transporter: "nats://localhost:4222",
	logLevel: "info",
	requestTimeout: 5 * 1000
});
n2Broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		}
	}
});

const n1Broker = new ServiceBroker({
	nodeID: "n1Broker",
	transporter: "nats://localhost:4222",
	logLevel: "info",
	requestTimeout: 5 * 1000
});

let stime, etime
n1Broker.start()
	.then(() => {
		return n2Broker.start()
	})
	.then(() => {
		stime = Date.now()
		let ps = []
		for (let i = 0; i < 20000; ++i)
			ps.push( n1Broker.call("math.add", {
				a: 5,
				b: 3
			}) )
		return Promise.all( ps )
	})
	.then(() => {
		etime = Date.now()
		console.log( '????', (etime - stime) )
	})
	.catch(err => {
		n1Broker.logger.error(`Error occurred! Action: '${err}', Message: ${err.code} - ${err.message}`);
		if (err.data)
			n1Broker.logger.error("Error data:", err.data);
	});
