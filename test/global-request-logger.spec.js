'use strict';


const should        = require('chai').should();
const http          = require('http');
const _             = require('lodash');
const globalLogger  = require('../index');

describe('Global Request Logger', function () {
  describe('request overrides', function () {
    it('should return a singleton instance', function () {
      const globalLogger2 = require('../index');
      globalLogger.should.equal(globalLogger2);
    });

    it('should mixin globals', function () {
      const origHttpRequest = http.request;
      globalLogger.initialize();
      (http.request !== origHttpRequest).should.equal(true, 'after init http is overwritten');
      globalLogger.end();
    });

    it('should reset globals on end', function () {
      const origHttpRequest = http.request;
      globalLogger.initialize();
      globalLogger.end();
      (http.request === origHttpRequest).should.equal(true, 'after end http is restored');
    });
  });


  describe('initialize', function () {
    it('should set default options', function () {
      globalLogger.initialize();
      globalLogger.should.have.property('maxBodyLength', 1024 * 1000 * 3);
      globalLogger.end();
    });

    it('should allow specifying options', function () {
      globalLogger.initialize({maxBodyLength: 1024 * 1000 * 10});
      globalLogger.should.have.property('maxBodyLength', 1024 * 1000 * 10);
      globalLogger.end();
    });

    it('should set isEnabled property', function () {
      globalLogger.initialize();
      globalLogger.should.have.property('isEnabled', true);
      globalLogger.end();
    });
  });

  describe('end', function () {
    it('should set isEnabled properly', function () {
      globalLogger.initialize();
      globalLogger.end();
      globalLogger.should.have.property('isEnabled', false);
    });
  });

  describe('request logging', function () {
    const nock = require('nock');

    describe('events', function () {
      before(function () {
        globalLogger.initialize();
        nock.disableNetConnect();
      });
      after(function () {
        globalLogger.end();
      });

      it('should log request error', function (done) {
        http.get('http://www.example.com');
        globalLogger.once('error', function (req, res) {
          should.exist(req);
          req.should.have.property('error');

          should.exist(res);
          _.keys(res).should.have.lengthOf(0);
          done();
        });
      });

      it('should log request success', function (done) {
        nock('http://www.example.com')
          .get('/')
          .reply(200, 'Example');

        http.get('http://www.example.com');

        globalLogger.once('success', function (req, res) {
          should.exist(req);
          req.should.have.property('method');
          req.should.have.ownProperty('headers');

          should.exist(res);
          res.should.have.property('statusCode');
          res.should.have.property('headers');
          res.should.have.property('body');
          done();
        });
      });

      it('should log request body', function (done) {
        nock('http://www.example.com')
          .get('/')
          .reply(200, 'Example');

        const req = http.get('http://www.example.com');
        req.write('Write to the body');
        globalLogger.once('success', function (req) {
          should.exist(req);
          req.should.have.property('body', 'Write to the body');
          done();
        });
      });

      it('should limit the request maxBodyLength', function (done) {
        nock('http://www.example.com')
          .get('/')
          .reply(200, 'Example');

        globalLogger.maxBodyLength = 2;

        const req = http.get('http://www.example.com');
        req.write('Write to the body');
        globalLogger.once('success', function (req) {
          should.exist(req);
          req.should.have.property('body', 'Wr');
          done();
        });
      });

      it('should limit the response maxBodyLength', function (done) {
        nock('http://www.example.com')
          .get('/')
          .reply(200, 'Example');

        const req = http.get('http://www.example.com');
        req.write('Write to the body');
        globalLogger.once('success', function (req, res) {
          res.should.have.property('body', 'Ex');
          done();
        });
      });

      it('should combine chunked request body data', function (done) {
        nock('http://www.example.com')
          .get('/')
          .reply(200, 'Example');

        globalLogger.maxBodyLength = Infinity;
        const req = http.get('http://www.example.com');
        req.write('Write');
        req.write('To');
        req.write('The');
        req.write('Body');

        globalLogger.once('success', function (req, res) {
          req.should.have.property('body', 'WriteToTheBody');
          done();
        });
      });
    });
  });
});
