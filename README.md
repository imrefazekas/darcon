# darcon

Simple Messaging Bus for Node.js entities over NatsIO

The library allows one to transparently publish and scale plain vanilla JS objects to a running [nats.io](https://nats.io) instance as services objects.

The concept is simple:
- entities with services to be published are defined within your application. Each entity must possess a unique name.
- all functions defined be the entities are can be called through the message bus
- any amount of [darcon](https://github.com/imrefazekas/darcon) instance can be created around a given entity allowing one to scale a service endlessly over [nats.io](https://nats.io).

!Note: the presente of the messge bus induces the requirement of _'jsonifiable'_ objects to be passed as paramters!

A single [darcon](https://github.com/imrefazekas/darcon) instance can manage multiple entities. To scale a service up, a single entity can be published to multiple [darcon](https://github.com/imrefazekas/darcon) instances.

The [darcon](https://github.com/imrefazekas/darcon) instances know about each other and share the "map of entities" and manage message transmission to load balance.


## Installation

```javascript
npm install daron
```

## Usage

```javascript
const Darconer = require('darcon')
// ...
await Darconer.init( {
	nats: {
		url: 'nats://localhost:4222'
	},

	log: {
		level: 'info'
	}
} )
// ...
await Darconer.publish(
	{
		name: 'Marie',
		async greetings () {
			return 'Hello'
		}
	}
)
```

That is all!



## License

(The MIT License)

Copyright (c) 2020 Imre Fazekas

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


## Bugs

See <https://github.com/imrefazekas/darcon/issues>.
