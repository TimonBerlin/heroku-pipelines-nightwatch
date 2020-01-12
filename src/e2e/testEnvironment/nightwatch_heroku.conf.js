module.exports = {
  'src_folders': [
    'src/e2e/tests/'
  ],
  'output_folder': false,
  'test_settings': {
    'default': {
      webdriver: {
        start_process: true,
        server_path: '/app/.chromedriver/bin/chromedriver',
        port: 4242,
        cli_args: ['--port=4242', '--verbose']
      },
      'desiredCapabilities': {
        'browserName': 'chrome',
        'javascriptEnabled': true,
        'acceptInsecureCerts': true,

        'chromeOptions': {
          w3c: false,
          'binary': process.env.GOOGLE_CHROME_SHIM,
          'args': [
            'headless',
            'disable-gpu',
            'disable-dev-shm-usage',
            'no-sandbox',
            'window-size=1200,900',
            '--user-agent=Mozilla/5.0 (Linux; Android 7.0; SM-G930VC Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36'
          ]
        }
      },
      'globals': {
        'launch_https_url': 'http://localhost:' + process.env.PORT + '/',
        'launch_http_url': 'http://localhost:' + process.env.PORT + '/'
      }
    }

  }
};
