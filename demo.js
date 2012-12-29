require('npm-trospect').require = require; //global require
var Resource = require('./protolus-resource');
require('./handler-js');

var app = require('http').createServer(function handler(req, res){
    Resource.handle(req, res, function(){
        new Resource('test-component', function(){
            Resource.head(true, function(tags){
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