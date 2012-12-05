var should = require("should");
var request = require('request');
describe('ProtolusResource', function(){
    describe('Simple \'test-component\' tests', function(){
        it('js URL is non-empty and serves valid JS', function(){
            request('http://localhost/js/test-component', function (error, response, body) {
                var check = require('syntax-error');
                if (!error && response.statusCode == 200) {
                    should.not.equal(body, '');
                    var err = check(body);
                    should.not.exist(err);
                }
            });
        });
        it('css URL is non-empty', function(){
            request('http://localhost/css/test-component', function (error, response, body) {
                var check = require('syntax-error');
                if (!error && response.statusCode == 200) {
                    should.not.equal(body, '');
                }
            });
        });
    });
});