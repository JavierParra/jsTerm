var websocket = require('websocket'),
    net = require('net'),
    http = require('http'),
    telnetRegex = /^telnet\|(.*)\|(.*)$/;

var clients = [];

function lookupClientByConn(conn) {
    for (var client in clients) {
        if (client.conn == conn) {
            return client;
        }
    }
    return null;
}
    


function createServer(){
    var httpServer = http.createServer().listen(9999, function() {
        console.log("WS server is listening on " + 9999);
    });

    httpServer.on("request", function(req, res) {
        console.log("new http request:" + JSON.stringify(res));
    });
    
    httpServer.on("close", function() {
        console.log("httpServer closed");
    })
    
    var wsServer = new websocket.server({
        httpServer: httpServer
    });
    
    wsServer.on("request", function(req) {
        console.log("new ws req from: " + req.origin);
        var conn = req.accept(null, req.origin);
        buildConnection(conn);
        // TODO: add client
        //clients.push({conn: conn});
    });
    
    wsServer.on("close", function(conn, reason, desc) {
        console.log("ws server close: " + reason + " : " + desc);
    });
    
    return wsServer;
}


function buildConnection(conn) {
    conn.on('message', function(msg) {
        console.log("msg: " + msg.utf8Data);
        var match = msg.utf8Data.match(telnetRegex)
            , host
            , port;
        if (match) {
            console.log("begin telnet...");
            host = match[1];
            port = match[2];
            telnet(host, port, conn);
        } else {
            var socket = conn._socket;
            if (!socket) {
                console.error("no binded socket for conn.");
                conn.close();
                return;
            }
            // proxy write to socket
            socket.write(msg.utf8Data);
        }
    });
    
    conn.on('close', function() {
        console.log("ws conn close");
        
    });
    
    conn.on('error', function() {
        console.error("ws conn error");
        
    });
    
    return conn;
}

function telnet(host, port, wsConn) {        
    var socket = net.connect(port, host);
    
    socket.on("connect", function() {
        console.log("telnet connected.")
    });
    
    socket.on("data", function(data) {
        console.log("[telnet data] " + data.toString());
        wsConn.sendUTF(data.toString());
    });
    
    socket.on("end", function() {
        console.log("telnet reset by peer.")
    });
    socket.on("drain", function() {
        console.log("telnet drain.")
    });
    
    socket.on("error", function(e) {
        console.log("telnet error: " + JSON.stringify(e));
    });
    
    socket.on("close", function(had_error) {
        console.log("telnet close: " + had_error);
    });
    
    // bind socket to conn;
    wsConn._socket = socket;
    
    return socket;
}

createServer();



