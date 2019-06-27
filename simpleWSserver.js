let WebSocketServer = require('ws').Server;
let wss = new WebSocketServer({ port: 8082 });

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send('something');
});
