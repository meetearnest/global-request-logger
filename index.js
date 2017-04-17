'use strict';

var
  http           = require('http'),
  https          = require('https'),
  _              = require('lodash'),
  events         = require('events'),
  util           = require('util'),
  url            = require('url')
;

var ORIGINALS;
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

var GlobalLog = function () {
  this.isEnabled = false;
  events.EventEmitter.call(this);
};
util.inherits(GlobalLog, events.EventEmitter);

var globalLogSingleton = module.exports = new GlobalLog();


function logBodyChunk(array, chunk) {
  if (chunk) {
    var toAdd = chunk;
    var newLength = array.length + chunk.length;
    if (newLength > globalLogSingleton.maxBodyLength) {
      toAdd = chunk.slice(0, globalLogSingleton.maxBodyLength - newLength);
    }
    array.push(toAdd);
  }
}


function attachLoggersToRequest(protocol, options, callback) {
  var httporhttps = this;
  var req = ORIGINALS[protocol].request.call(httporhttps, options, callback);

  var logInfo = {
    request: {},
    response: {}
  };

  // Extract request logging details
  if (typeof options === 'string') {
    options = url.parse(options);
  }
  _.assign(logInfo.request, _.pick(options, 'port', 'path', 'host', 'protocol', 'auth', 'hostname', 'hash', 'search', 'query', 'pathname', 'href'));

  logInfo.request.method = req.method || 'get';
  logInfo.request.headers = req._headers;

  var requestData = [];
  var originalWrite = req.write;
  req.write = function() {
    logBodyChunk(requestData, arguments[0]);
    originalWrite.apply(req, arguments);
  };

  var originalEnd = req.end;
  req.end = function() {
    logInfo.start = Date.now();
    originalEnd.apply(req, arguments);
  };

  req.on('error', function (error) {
    logInfo.request.error = error;
    globalLogSingleton.emit('error', logInfo.request, logInfo.response);
  });

  req.on('response', function (res) {
    logInfo.request.body = requestData.join('');
    _.assign(logInfo.response, _.pick(res, 'statusCode', 'headers', 'trailers', 'httpVersion', 'url', 'method'));
    logInfo.response.duration = Date.now() - logInfo.start;

    var responseData = [];
    res.on('data', function (data) {
      logBodyChunk(responseData, data);
    });
    res.on('end', function () {
      logInfo.response.body = responseData.join('');
      globalLogSingleton.emit('success', logInfo.request, logInfo.response);
    });
    res.on('error', function (error) {
      logInfo.response.error = error;
      globalLogSingleton.emit('error', logInfo.request, logInfo.response);
    });
  });

  return req;
}


GlobalLog.prototype.initialize = function (options) {
  options = options || {};
  _.defaults(options, {
    maxBodyLength: 1024 * 1000 * 3
  });
  globalLogSingleton.maxBodyLength = options.maxBodyLength;


  try {
    saveGlobals();
    http.request = attachLoggersToRequest.bind(http, 'http');
    globalLogSingleton.isEnabled = true;
  } catch (e) {
    resetGlobals();
    throw e;
  }
};

GlobalLog.prototype.end = function () {
  resetGlobals();
};
