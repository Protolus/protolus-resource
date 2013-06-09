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
                if(e){
                    console.log('LESS ERROR', e);
                    callback('/* ERROR : '+e.message+'*'+'/');
                }else{
                    try{
                        var css = tree.toCSS({ compress: options.compact || false });
                        callback(css);
                    }catch(ex){
                        console.log('LESS ERROR', ex);
                    }
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
var instance = new LessHandler();
Resource.registerHandler('less', instance);
LessHandler.instance = instance;
module.exports = LessHandler;