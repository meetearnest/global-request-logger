'use strict';

const http = require('http');
const https = require('https');
const _ = require('lodash');
const events = require('events');
const util = require('util');
const url = require('url');

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
  let self = this;
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
  logInfo.request.time = new Date();

  const requestData = [];
  let originalWrite = req.write;
  req.write = function () {
    logBodyChunk(requestData, arguments[0]);
    originalWrite.apply(req, arguments);
  };

  req.on('error', function (error) {
    logInfo.request.error = error;
    globalLogSingleton.emit('error', logInfo.request, logInfo.response);
  });

  //Wrap the request.emit method with a mocked emit method
  fill(req, 'emit', function (origEmit) {
    return function (eventType, maybeResponse) {

      //Only mock emit for responses
      if (eventType === 'response') {

        //Create the logger body
        logInfo.request.body = requestData.join('');

        const propertiesToPick = ['statusCode', 'headers', 'trailers', 'httpVersion', 'url', 'method'];
        const responseProperties = _.pick(maybeResponse, propertiesToPick);

        _.assign(logInfo.response, responseProperties);

        logInfo.response.time = new Date();

        const responseTimeMillis = logInfo.response.time.getTime() - logInfo.request.time.getTime();
        logInfo.response.responseTime = responseTimeMillis + 'ms';

        let responseData = [];

        //Emit a simulated response for the response of the request
        fill(maybeResponse, 'emit', function (simulatedResponse) {
          return function (evt, data) {

            //Log the data
            if (evt === 'data') {
              logBodyChunk(responseData, data);

              //Emit success if the request is ended
            } else if (evt === 'end') {
              logInfo.response.body = responseData.join('');
              globalLogSingleton.emit('success', logInfo.request, logInfo.response);

              //Emit error event if there is any error
            } else if (evt === 'error') {
              logInfo.response.error = error;
              globalLogSingleton.emit('error', logInfo.request, logInfo.response);
            }
            return simulatedResponse.apply(this, arguments);
          };
        });
      }
      return origEmit.apply(this, arguments);
    };
  });

  return req;
}

/**
 * Polyfill a method
 * @param {Object} obj object e.g. `document`
 * @param {string} name - method name present on object e.g. `addEventListener`
 * @param {function} replacement replacement function
 */
function fill(obj, name, replacement) {
  const orig = obj[name];
  obj[name] = replacement(orig);
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
