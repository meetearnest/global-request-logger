# Node.js Global Request Logger

This is a publicly available library published by Earnest.

This public module configures the [`http`](http://nodejs.org/api/http.html) and [`https`](http://nodejs.org/api/https.html) 
modules to raise logging events for every outgoing http request.

Any library or module that uses the default `http` and `https` modules will be captured. The primary use case is for 
centrally adding logging to all outbound api calls to third-party services without needing to manipulate those modules.

The logger will capture request and response arguments as well as the body sent or received.

## Example

An example log object for a call to `https://www.google.com`:

**Request**
```js
{ protocol: 'https:',
  slashes: true,
  auth: null,
  host: 'www.google.com',
  port: null,
  hostname: 'www.google.com',
  hash: null,
  search: null,
  query: null,
  pathname: '/',
  path: '/',
  href: 'https://www.google.com/',
  method: 'GET',
  headers: { host: 'www.google.com' },
  body: '' 
}
```

**Response**
```js
{ statusCode: 200,
  headers:
   { date: 'Sun, 17 Aug 2014 20:03:02 GMT',
     expires: '-1',
     'cache-control': 'private, max-age=0',
     'content-type': 'text/html; charset=ISO-8859-1',
     'set-cookie':
      [ 'PREF=ID=29ba00825c529e14:FF=0:TM=1408305782:LM=1408305782:S=7FwX1DADc9nIkUE1; expires=Tue, 16-Aug-2016 20:03:02 GMT; path=/; domain=.google.com',
        'NID=67=qAT-ji1lswEweR4BMbdLhdZHczj54O6s-OSFgH_rcjXLpOtjej9OR8ADiptMVjARY1hTWPadfixc3lZkfX41XuLFKK_B2J-hsEFHEdxkiL2IAW_AUyZ1MDYUs-Z8_l8q; expires=Mon, 16-Feb-2015 20:03:02 GMT; path=/; domain=.google.com; HttpOnly' ],
     p3p: 'CP="This is not a P3P policy! See http://www.google.com/support/accounts/bin/answer.py?hl=en&answer=151657 for more info."',
     server: 'gws',
     'x-xss-protection': '1; mode=block',
     'x-frame-options': 'SAMEORIGIN',
     'alternate-protocol': '443:quic',
     'transfer-encoding': 'chunked' },
  trailers: {},
  httpVersion: '1.1',
  url: '',
  method: null,
  body: '<!doctype html><html itemscope="" itemtype="http://schema.org/WebPage" lang="en">...</html>' }
```
 
# Usage
 
To enable logging events initialize the global logger:
 
```js
var globalLog = require('global-request-logger');
globalLog.initialize();
```

This will now raise `success` and `error` events for every http or https request:

```js
globalLog.on('success', function(request, response) {
  console.log('SUCCESS');
  console.log('Request', request);
  console.log('Response', response);
});

globalLog.on('error', function(request, response) {
  console.log('ERROR');
  console.log('Request', request);
  console.log('Response', response);
});
```

You may optionally disable logging using the `end` function:
 
```
globalLog.end();
```

## Options

The `initialize` function accepts an options argument that can configure logging.
 
- **maxBodyLength** - The maximum length (in bytes) to log for a request or response body.

# Contributing

To get started, take a look at the output of `./go help`.
Then, run `./go` to configure the environment and dependencies.

## Getting Started:
Usage: ./go <command>

Available commands are:
    help              Show this help
    exec              Execute any command inside the dev image
    nuke              Destroy all your running containers
    prepush           Run prepush checks (e.g. test, lint)
    test              Run all tests
    test:watch        Run tests in watch mode
    install           Install dependencies
    lint              Lint the repository
    lint:fix          Lint in fix mode

You can pass any of those as an argument to run the related task in this repository. 

## Testing

Use either `./go test` or `./go test:unit` to run 
