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
            },
            pathTarget : 'href'
        };
    }
});
Resource.registerHandler('css', new CSSHandler());
module.exports = CSSHandler;