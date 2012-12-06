var should = require("should");
var request = require('request');
var http = require('http');
var port = 221;
var resource = require('./protolus-resource');
describe('ProtolusResource', function(){
    describe('Simple \'test-component\' tests', function(){
        var server;
        var running = false;
        before(function(done){
            try{
                server = http.createServer(function(req, res) {
                    resource.handleResourceCalls(req, res, function(){
                        //serve a page
                    });
                }).listen(port);
                server.on("listening", function() {
                    running = true;
                    done();
                });
            }catch(ex){
                should.not.exist(ex);
            }
        });
        
        it('Server Runs', function(){
            should.equal(running, true);
        });
        
        it('js URL is non-empty and serves valid JS', function(done){
            request('http://localhost:'+port+'/js/test-component', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var check = require('syntax-error');
                    body.should.not.equal('');
                    var err = check(body);
                    should.not.exist(err);
                }
                if(error) should.fail('Error fetching URL', error);
                if(response.statusCode != 200) should.fail('Fetch not OK', 'Code:'+response.statusCode);
                done();
            });
        });
        
        it('css URL is non-empty', function(done){
            request('http://localhost:'+port+'/css/test-component', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var check = require('syntax-error');
                    body.should.not.equal('');
                }
                if(error) should.fail('Error fetching URL', error);
                if(response.statusCode != 200) should.fail('Fetch not OK', 'Code:'+response.statusCode);
                done();
            });
        });
        
        after(function(done) {
            server.close();
            done();
        });
    });
});