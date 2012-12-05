var resource = require('./protolus-resource');

var app = require('http').createServer(function handler(req, res) {
    resource.handleResourceCalls(req, res, function(){
        //serve a page
    });
});
app.listen(80);

var request = require('request');

request('http://localhost/js/test-component', function (error, response, body) {
    var check = require('syntax-error');
    if (!error && response.statusCode == 200) {
        var err = check(body);
        if(err) throw('OMG, Error!')
        else console.log('No Errors!');
    }
});