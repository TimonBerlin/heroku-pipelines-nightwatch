const express = require('express');
const app = express();
const PORT = 9080;

// Serves some static files
app.use(express.static(__dirname + '/static'));
console.log(__dirname + 'static');

let server = app.listen(PORT, () => {
  console.log(`Listening on port ${ PORT }!`);
  // Notify the listeners when the server is ready.
  app.emit('listening', server);
});


module.exports = app;