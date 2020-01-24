# How to run Nightwatch tests on Heroku Pipelines
End-to-End testing is a very important part of every good continuous integration process and
[Nightwatch.js](https://nightwatchjs.org/) is a great tool for that purpose.
In this article, I will show you how you can easily integrate Nightwatch into your Heroku build pipeline.
We are going to use [Node.js](https://nodejs.org/en/) and [Express](https://expressjs.com/de/) and the test will be run in a Chrome browser.

You can find the finished example project [here](https://github.com/TimonBerlin/heroku-pipelines-nightwatch)
> "No amount of testing can prove a software right, a single test can prove a software wrong." 
>
>— Amir Ghahrai

## Having the right buildpacks
At first we have to define the required buildpacks.
With buildpacks you can specify how Heroku should setup the machine on which your app and ci will be running.
If you want to know more about buildpacks you can have a look at the Heroku 
[documentation](https://devcenter.heroku.com/articles/buildpacks).

For our purpose we need three buildpacks:
1. NodeJs to run our application. [Link](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-nodejs)
2. Google Chrome to run our Nightwatch tests. [Link](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-google-chrome)
3. And the ChromeDriver so that Nightwatch can control the Chrome browser. [Link](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-chromedriver)

We simply do this by adding an `app.json` file to the base of our Project and add the following block.

```json
{
    "buildpacks": [
      { "url": "https://github.com/heroku/heroku-buildpack-nodejs" },
      { "url": "https://github.com/heroku/heroku-buildpack-google-chrome" },
      { "url": "https://github.com/heroku/heroku-buildpack-chromedriver" }
    ]
}
```
If you want to know more about what the `app.json` does you can check out the documentation about it [here](https://devcenter.heroku.com/articles/app-json-schema).

That's it! Now we are already done with the buildpack setup.

## Create a Nightwatch config
Now that we have added the ChromeDriver and browser to our environment we need to tell Nightwatch where to find those. 
We do this by creating a new Nightwatch configuration or by adding an environment to an existing one.

In this example, we will just create a new configuration file called `nightwatch_heroku.conf.js`.

To make everything work we have to add some configuration stuff.
Under the webdriver key we have to specify the `server_path`. Here we need to add the directory to the ChromeDriver. When you use the suggested buildpack the default path to the driver is `/app/.chromedriver/bin/chromedriver`.

We also have to add the path to the Chrome binary under `desiredCapabilities`.
The buildpack which installs the Chrome browser automatically adds an environment variable with the correct path so we can just use that.

And that’s it! Now we have our Nightwatch configuration file.

```javascript
{ 
  "webdriver": {
    // Path to chromedriver which got installed via the buildpack.
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
        // Path to the chrome binary which got installed via the buildpack. 
        // This environment variable is set automatically by the buildpack itself.
         "binary": process.env.GOOGLE_CHROME_SHIM
      }
    }
  }
}
```

## Preparing your index.js
Before we start testing, we need to make some preparations on our `index.js`.

At first we have to make sure that our app uses the right port.
Heroku will automatically set an environment variable with the port we can use.
So we just going to use that port or some default port for local testing.
```javascript
const PORT = process.env.PORT || 9080;
```

We also have to make sure that our app will emit an event when the startup process is done.
We doing this by simply using the callback method from the listen function. After our app is
listening on the desired port we just emit an event.  

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

If you are using any other framework than express, you have to find your own implementation for that.

And that´s it! Our `index.js` is ready now.
In the next step, we will create a test runner script which now can wait until the app is fully started before it will start with the tests.

## Creating a test runner script
Next we have to create a Nightwatch runner.
This runner will start Nightwatch from the code instead of the command line.
We create a new file called `herokuTestRunner.js`.

As you can see in the code below, at first we wait till our app is emiting the `listening` event.
Now we know that the app is ready and we can start with the testing. This is done with the Nightwatch cli function.
We just have to specify the path to our configuration file and pass it over in the `argv` object.
In this object you can add any Nightwatch cli argument. 

After that we start the test and define what will happen in case of errors or if all tests
run successfully. If our test process terminates with anything else then zero, Heroku will
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
## Running the test automatically
Everytime we build a branch on Heroku we want to run our Nightwatch test as well.
We simply have to add another npm script which will execute our test runner.
Just add the following line to your `package.json`.
```json
// Just add the path to your test runner script here
"e2e:heroku": "node ./src/e2e/herokuTestRunner.js",
```
Know we have to tell Heroku which script it should run when testing our app.
This is done in the `app.json` We simply add the following block.

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
The `test-setup` script will run before our test run. You can add your custom test setups here.
The `test` script defines which scripts will be run in the test step.

So we just add our normal test there and also add our custom Nightwatch script.
And that's it! Now when you trigger your Heroku CI you should see your running Nightwatch tests running.


## TL;DR
If you don't have the time to read through all this, here are the basic steps:

1. Add the buildpacks for Chrome and ChromeDriver to your `app.json`
2. Create a custom Nightwatch configuration for Heroku with the right paths to Chrome and ChromeDriver.
3. Create an in code Nightwatch runner.
4. Add an npm script to run your Heroku Nightwatch runner.
5. Add the npm script to your `app.json` so Heroku will run it with every build.

And as I mentioned before you can check out the example project on GitHub [here](https://github.com/TimonBerlin/heroku-pipelines-nightwatch).
