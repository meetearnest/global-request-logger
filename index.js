'use strict';

const  http           = require('http');
const  https          = require('https');
const  _              = require('./object-functions');
const  events         = require('events');
const  util           = require('util');
const  url            = require('url');

let ORIGINALS;
function saveGlobals() {
  ORIGINALS = {
    http: _.pick(http, 'request'),
    https: _.pick(https, 'request')
  };
}

function resetGlobals() {
  _.assign(http, ORIGINALS.http);
  _.assign(https, ORIGINALS.https);
  globalLogSingleton.isEnabled = false;
}

let GlobalLog = function () {
  this.isEnabled = false;
  events.EventEmitter.call(this);
};
util.inherits(GlobalLog, events.EventEmitter);

let globalLogSingleton = module.exports = new GlobalLog();


function logBodyChunk(array, chunk) {
  if (chunk) {
    let toAdd = chunk;
    let newLength = array.length + chunk.length;
    if (newLength > globalLogSingleton.maxBodyLength) {
      toAdd = chunk.slice(0, globalLogSingleton.maxBodyLength - newLength);
    }
    array.push(toAdd);
  }
}


function attachLoggersToRequest(protocol, options, callback) {
  globalLogSingleton.emit('before', protocol, options);
  let self = this;
  if (options.doNotLog) {
    return ORIGINALS[protocol].request.call(self, options, callback);
  }
  let req = ORIGINALS[protocol].request.call(self, options, callback);

  let logInfo = {
    request: {},
    response: {}
  };

  // Extract request logging details
  if (typeof options === 'string') {
    options = url.parse(options);
  }
  _.assign(logInfo.request,
    _.pick(
      options,
      'port',
      'path',
      'host',
      'protocol',
      'auth',
      'hostname',
      'hash',
      'search',
      'query',
      'pathname',
      'href'
  ));

  logInfo.request.method = req.method || 'get';
  logInfo.request.headers = req._headers;

  const requestData = [];
  // wrap the request _send instead of Write, because aws-sdk different behaviour between node 6 to node 8
  let original_send = req._send;
  req._send = function () {
    logBodyChunk(requestData, arguments[0]);
    original_send.apply(req, arguments);
  };

  req.on('error', function (error) {
    logInfo.request.error = error;
    logInfo.request.errorTime = new Date().getTime();
    globalLogSingleton.emit('error', logInfo.request, logInfo.response);
  });

  req.on('response', function (res) {
    globalLogSingleton.emit('response', req, res);
  
    logInfo.request.body = requestData.join('');
    _.assign(logInfo.response,
      _.pick(
        res,
        'statusCode',
        'headers',
        'trailers',
        'httpVersion',
        'url',
        'method'
    ));

    let responseData = [];
    res.on('data', function (data) {
      logBodyChunk(responseData, data);
    });
    if (res._readableState.needReadable) {
        res.pause();
    }
    res.on('end', function () {
      logInfo.response.body = responseData.join('');
      logInfo.response.recievedTime = new Date().getTime();
      globalLogSingleton.emit('success', logInfo.request, logInfo.response);
    });
    res.on('error', function (error) {
      logInfo.response.error = error;
      logInfo.response.errorTime = new Date().getTime();
      globalLogSingleton.emit('error', logInfo.request, logInfo.response);
    });
  });

  logInfo.request.sendTime = new Date().getTime();
  
  return req;
}


GlobalLog.prototype.initialize = function (options) {
  if(globalLogSingleton.isEnabled) return;

  options = options || {};
  _.defaults(options, {
    maxBodyLength: 1024 * 1000 * 3
  });
  globalLogSingleton.maxBodyLength = options.maxBodyLength;


  try {
    saveGlobals();
    //http.request = attachLoggersToRequest.bind(http, 'http');
    https.request = attachLoggersToRequest.bind(https, 'https');
    globalLogSingleton.isEnabled = true;
  } catch (e) {
    resetGlobals();
    throw e;
  }
};

GlobalLog.prototype.end = function () {
  resetGlobals();
};
