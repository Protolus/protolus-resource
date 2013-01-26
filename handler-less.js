var Resource = require('./protolus-resource');
var Class = require('Classy');
var less = require('less');
var LessHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('less');
    },
    handle : function(options, callback){
        var path = process.cwd()+options.location;
        var parts = path.split('/');
        parts.pop();
        var dir = parts.join('/');
        try{
        var parser = new(less.Parser)({
            paths: [dir], // Specify search paths for @import directives
            filename: path // Specify a filename, for better error messages
        });
            parser.parse(options.body, function (e, tree) {
                if(e) callback('/* ERROR : '+e+'*'+'/');
                else{
                    var css = tree.toCSS({ compress: options.compact || false });
                    callback(css);
                }
            });
        }catch(ex){
            callback('/* ERROR : '+ex.message+'*'+'/');
        }
    },
    tagProfile : function(){
        return {
            name : 'link',
            attrs : {
                rel:"stylesheet",
                type:"text/css" 
            },
            target : 'href'
        };
    }
});
Resource.registerHandler('less', new LessHandler());
module.exports = LessHandler;