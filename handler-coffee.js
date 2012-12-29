var Resource = require('./protolus-resource');
var Class = require('Classy');
var coffee = new require('coffeescript-compiler')();

var CoffeeScriptHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('coffee');
    },
    handle : function(options, callback){
        coffee.compile(options.body, {bare: !options.compact}, function(js){
            js += "\n"+' //@sourceURL='+options.location+"\n"
            callback(js);
        });
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
Resource.registerHandler('coffee', new CoffeeScriptHandler());

module.exports = CoffeeScriptHandler;