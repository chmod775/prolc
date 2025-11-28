// server.js
const net = require('net');

const PORT = 3000;
const HOST = '0.0.0.0';

let lastID = undefined;

const server = net.createServer((socket) => {
  console.log('Client connesso:', socket.remoteAddress, socket.remotePort);

  // Ricezione dati
  socket.on('data', (chunk) => {

    let id = chunk[5];
    if (lastID != undefined) {
      if (id - lastID > 1) {
        console.log(`error diff: ${id - lastID}`);
        console.log('RX:', chunk);
      }
    }
    lastID = id;

    // console.log('RX:', chunk);
    // Echo back
    // socket.write(`Echo: ${chunk}`);
  });

  socket.on('end', () => {
    console.log('Client disconnesso');
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// Avvio server
server.listen(PORT, HOST, () => {
  console.log(`Server TCP in ascolto su ${HOST}:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
