var should = require("should");
var request = require('request');
var http = require('http');
var port = 4599;
describe('ProtolusResource', function(){
    describe('Simple \'test-component\' tests', function(){
        var server
        before(function(done){
            try{
                server = http.createServer(function(req, res) {
                    console.log('Server Running');
                    resource.handleResourceCalls(req, res, function(){
                        //serve a page
                    });
                    done();
                }).listen(port);
            }catch(ex){
                should.not.exist(ex);
            }
        });
        it('Server Runs', function(){
            //should.not.exist(ex);
            /*
            try{
                http.createServer(function(req, res) {
                    console.log('Server Running');
                    resource.handleResourceCalls(req, res, function(){
                        //serve a page
                    });
                }).listen(80);
            }catch(ex){
                should.not.exist(ex);
            }//*/
        });
        it('js URL is non-empty and serves valid JS', function(){
            /*try{
                http.createServer(function(req, res) {
                    console.log('Server Running');
                    resource.handleResourceCalls(req, res, function(){
                        //serve a page
                    });
                }).listen(port);
            }catch(ex){
                should.not.exist(ex);
            }*/
            console.log('blah');
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