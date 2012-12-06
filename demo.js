var resource = require('./protolus-resource');

var app = require('http').createServer(function handler(req, res) {
    resource.handleResourceCalls(req, res, function(){
        resource('test-component', function(){
            resource.headIncludes(true, function(tags){
                res.end('<html>'+"\n  "+'<head>'+"\n    "+(tags.join("\n    "))+"\n  "+'</head>'+"\n  "+'<body><h1>Heya!</h1>'+"\n  "+'</body>'+"\n"+'</html>');
            }); 
        });
    });
});
app.listen(80);

var request = require('request');

/*request('http://localhost/js/test-component', function (error, response, body) {
    var check = require('syntax-error');
    if (!error && response.statusCode == 200) {
        var err = check(body);
        if(err) throw('OMG, Error!')
        else console.log('No Errors!');
    }
});*/