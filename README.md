# How to run your Nightwatch tests on Heroku Pipelines
End-to-End testing is a very important part of every good continuous integration process and
[Nightwatch.js](https://nightwatchjs.org/) is a great tool for that purpose.
In this article, i will show you how you can easily integrate Nightwatch into your Heroku build pipeline.
In this expample we are going to use node and express.

You can find the finished example project [here](https://github.com/TimonBerlin/heroku-pipelines-nightwatch)
> "No amount of testing can prove a software right, a single test can prove a software wrong." 
>
>— Amir Ghahrai

## Having the right buildpacks
At first we have to define the required buildpacks.
With buildpacks you can specify how Heroku should setup the machine on which your app and ci will be running.
If you want to know more about buildpacks you can have a look at the heroku 
[documentation](https://devcenter.heroku.com/articles/buildpacks).

For our purpose we need three buildpacks:
1. NodeJs to run our application
2. Google Chrome to run our Nightwatch tests
3. And the chromedriver so that Nightwatch can control the chrome browser

We simply do this by adding an 'app.json' file to the base of our Project and add the following block.

```json
{
    "buildpacks": [
      { "url": "https://github.com/heroku/heroku-buildpack-nodejs" },
      { "url": "https://github.com/heroku/heroku-buildpack-google-chrome" },
      { "url": "https://github.com/heroku/heroku-buildpack-chromedriver" }
    ]
}
```
If you want to know more about what the 'app.json' does you can check out the documentation about it [here](https://devcenter.heroku.com/articles/app-json-schema)

And that's it now we are done with the buildpack setup.
## Create a Nightwatch config
Now that we have added the chrome driver and browser to our environment we need to tell Nightwatch where to find this. 
We do this by creating a new Nightwatch configuration or add an environment to our existing one.

In this example, we will just create a new configuration file called 'nightwatch_heroku.conf.js' in the folder 'testEnvironment'.

To make everything work we have to add some configuration stuff.
Under the webdriver key we have to specify the ‘server_path’. Here we are gonna add the directory to the chrome driver. When you use the suggested buildpack the default path to the driver is ‘/app/.chromedriver/bin/chromedriver’.

We also have to add the path to the chrome binary under ‘desiredCapabilities’.
The buildpack which installs the chrome browser automatically adds an environment variable with the correct path so we can just use that.

And that’s it now we are done with the Nightwatch configuration file.

```json
{ 
  "webdriver": {
    // Path to chromedriver which got installed over the buildpack.
    "server_path": "/app/.chromedriver/bin/chromedriver",
    "cli_args": [
      "--verbose"
    ],
    "port": 9090
  },
  
  "test_settings" : {
    "default" : {
      "desiredCapabilities" : {
        "browserName" : "chrome",
        // Path to the chrome binary which got installed over the buildpack. 
        // The environment variable is set automaticly by the buildpack itself.
         "binary": process.env.GOOGLE_CHROME_SHIM
      }
    }
  }
}
```

##Preparing your index.js
Before we start testing we need some preparations on our index.js.

At first we have to make sure that our app uses the right port.
Heroku will automatically set an environment variable with the port we can use.
So we just going to use that port or some default port for local testing.

We also have to make sure our app will emit an event when the startup process is done.
We doing this by simlply using the callback method from the listen function. After our app is
listing on the desired port we just emit an simple event.  

```javascript
const express = require('express');
const app = express();

// Heroku will set the port to use as an env var so you can use it.
// For local development just use any port you want.
const PORT = process.env.PORT || 9080;

// Serves some static files
app.use(express.static(__dirname + '/static'));

let server = app.listen(PORT, () => {
  console.log(`Listening on port ${ PORT }!`);
  // Notify the listeners when the server is ready.
  app.emit('listening', server);
});

module.exports = app;
```

If you are using any other framework then express you have to your own implementation for that.

And that´s it! our index.js is ready now.
In the next step, we will create a test runner script which now can wait until the app is`fully started before it will start with the tests.

##Creating a test runner script
Next we have to create a Nightwatch runner.
This runner will do the same thing as Nightwatch will do when you run it over the command line just in code.
We create a new file called 'herokuTestRunner.js' in the 'e2e' folder.

As you can see in the code below at first we wait till our app is emiting the 'listing' event.
Now we know that the app is ready and we can start with the testing. This is done with the Nightwatch cli function.
We just have to specify the path to our configuration file and pass it over the argv object.


In this object you can add any Nightwatch cli arguments. 
After that we start the test and define what will happen in case of errors or if all tests
run successfully. If our test process exit with anything else then zero Heroku will
mark this build as failed.

```javascript
// Path to your Heroku nightwatch conifg
const CONFIG_PATH = path.join(__dirname, 'testEnvironment/nightwatch_heroku.conf.js');

// waiting till the application is ready
app.on('listening', () => {

  const nightwatch = require('nightwatch');
  nightwatch.cli(async function (argv) {

    // here you can add nightwatch cli arguments like your configuration or additional stuff
    argv.config = CONFIG_PATH;

    // standard nightwatch cli runner startup
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
```
Now we have everything in place to run our Nightwatch tests!
##Running the test automatically
Everytime we build a branch on Heroku we want that our Nightwatch tests also runs.
We simply have to add another npm script which will execute our test runner.
Just add the following line to your package.json.
```json
// Just add the path to your test runner script here
"e2e:heroku": "node ./src/e2e/herokuTestRunner.js",
```
Know we have to tell Heroku which script it should run when testing our app.
This is done in the app.json. We simply add the following block.

```json
  "environments": {
    "test": {
      "scripts": {
        "test-setup": "echo \"here you can define what will happen before the test runs\" && exit 0 ",
        "test": "npm run test && npm run e2e:heroku"
      }
    }
  }
```
The "test-setup" script will run before our test run. You can add your custom test setups here.
The "test" script defines which scripts will be run in the test step.

So we just add our normal test there and also add our custom nightwatch script.
And that's it! Now when you trigger your heroku ci you should see your running Nightwatch tests running.


## TL;DR
If you dont have the time to read through all this here are the basic steps:

1. Add the buildpacks for chrome and chromedriver to your 'app.json'
2. Create a custom Nightwatch configuration for Heroku with the right paths to chrome and chromedriver.
3. Create an in code Nightwatch runner.
4. Add an npm script to run your Heroku Nightwatch runner.
5. Add the npm script to your 'app.json' so Heroku will run it with every build.

And as i mentioned before you can check out the example project on github  [here](https://github.com/TimonBerlin/heroku-pipelines-nightwatch).
