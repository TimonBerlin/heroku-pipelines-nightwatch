const app = require('../backend/app');
const path = require('path');
const { spawn } = require('child_process');
// Path to your nightwatch conifg
const CONFIG_PATH = path.join(__dirname, 'testEnvironment/nightwatch_heroku.conf.js');

// waiting till the application is ready
app.on('listening', () => {

  const nightwatch = require('nightwatch');
  nightwatch.cli(async function (argv) {

    // here you can add nightwatch cli arguments like your configuration or additional stuff
    argv.config = CONFIG_PATH;
    argv.suiteRetries = 3;

    // standard nightwatch cliRunner startup
    const runner = nightwatch.CliRunner(argv);

    try {
      await runner.setup();
      await runner.startWebDriver();
      await runner.runTests();
    } catch (error) {
      // test failed
      console.error(error);
      runner.processListener.setExitCode(1);
      process.exit(1);
    } finally {
      process.exit(0);
      // close your app
      app.close();
    }

  });

});

