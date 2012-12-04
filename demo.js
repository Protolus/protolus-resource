var resource = require('./protolus-resource');

resource('test-component', function(test){
    //test.files('js', function(files){
    //    console.log('files', files);  
    //});
    var app = require('http').createServer(function handler(req, res) {
        resource.handleResourceCalls(req, res, function(){
            //serve a page
        });
    });
    app.listen(80);
});