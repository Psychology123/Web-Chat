const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    const extname = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    }[extname] || 'text/plain';

    fs.readFile(__dirname + filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

// 广播在线人数给所有客户端
function broadcastStats() {
    const statsMessage = JSON.stringify({
        type: 'stats',
        onlineCount: clients.size
    });
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(statsMessage);
        }
    });
}

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('新用户连接，当前在线:', clients.size);
    
    // 新用户连接时，向所有客户端广播最新在线人数
    broadcastStats();

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            // 处理 ping 请求
            if (message.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    id: message.id,
                    time: message.time
                }));
                return;
            }
            
            // 处理普通消息，广播给所有客户端
            if (message.type === 'message') {
                const broadcastMessage = JSON.stringify(message);
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(broadcastMessage);
                    }
                });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('用户断开，当前在线:', clients.size);
        
        // 用户断开时，向所有客户端广播最新在线人数
        broadcastStats();
    });

    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();//用来获取网卡信息 ->真实的局域网 IPv4 地址
    let localIP = 'localhost';

    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
    }

    console.log(`服务器运行在:`);
    console.log(`本地访问: http://localhost:${PORT}`);
    console.log(`局域网访问: http://${localIP}:${PORT}`);
});

