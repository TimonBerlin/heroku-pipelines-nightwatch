const express = require('express');
const app = express();
const PORT = process.env.PORT || 9080;

// Serves some static files
app.use(express.static(__dirname + '/static'));
console.log(__dirname + 'static');

let server = app.listen(PORT, () => {
  console.log(`Listening on port ${ PORT }!`);
  // Telling the listeners that the server is ready.
  app.emit('listening', server);
});


module.exports = app;