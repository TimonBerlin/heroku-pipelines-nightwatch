module.exports = {

  'Hey i am a basic and very simple e2e test': browser => {

    browser
        .url(browser.globals.launch_https_url)
        .waitForElementVisible('[data-test="headline1"]')
        .end();

  }
};