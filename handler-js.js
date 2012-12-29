var Resource = require('./protolus-resource');
var Class = require('Classy');

var JavascriptHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('js');
    },
    handle : function(options, callback){
        options.body += "\n"+' //@sourceURL='+options.location+"\n"
        callback(options.body);
    },
    tagProfile : function(){
        return {
            name : 'script',
            attrs : {
            },
            target : 'src'
        };
    }
});
var JavascriptMainHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('js')
    },
    handle : function(options, callback){
        var text = options.body;
        var lines = text.split("\n");
        lines.push(' //@sourceURL='+options.location.replace('/./', '/'));
        text = JSON.stringify(lines).replace( /\\/g, '\\\\').replace(/'/g, "\\'");
        options.body = 'Protolus.register(\''+options.name+'\', \''+text+'\')';
        callback(options.body);
    },
    tagProfile : function(){
        return {
            name : 'script',
            attrs : {
            },
            target : 'src'
        };
    }
});
Resource.registerHandler('js', new JavascriptHandler());
Resource.registerHandler('main', new JavascriptMainHandler());

module.exports = JavascriptHandler;
module.exports.Main = JavascriptMainHandler;