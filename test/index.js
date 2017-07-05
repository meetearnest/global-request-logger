// hook into the re
/* eslint no-console: 0 */
const url        = require('url');
const https      = require('https');

const globalLog = require('./../index');


globalLog.initialize();

globalLog.on('success', function (request, response) {
  console.log('SUCCESS');
  console.log('Request', request);
  console.log('Response', response);
});

globalLog.on('error', function (request, response) {
  console.log('ERROR');
  console.log('Request', request);
  console.log('Response', response);
});


const opts = url.parse('https://www.google.com');
https.get(opts);
