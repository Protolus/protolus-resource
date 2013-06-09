var Resource = require('./protolus-resource');
var Class = require('Classy');

var CSSHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('css');
    },
    handle : function(options, callback){
        callback(options.body);
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
var instance = new CSSHandler();
Resource.registerHandler('css', instance);
CSSHandler.instance = instance;

module.exports = CSSHandler;