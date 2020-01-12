const express = require('express');
const app = express();
// Heroku will set the port to use as an env var so you can use it. For local development just use any port you want.
const PORT = process.env.PORT || 9080;

console.log("===Heroku Nightwatch Pipeline Demo===");

// Serves some static files
app.use(express.static(__dirname + '/static'));
console.log(__dirname + 'static');

let server = app.listen(PORT, () => {
  console.log(`Listening on port ${ PORT }!`);
  // Notify the listeners when the server is ready.
  app.emit('listening', server);
});


module.exports = app;