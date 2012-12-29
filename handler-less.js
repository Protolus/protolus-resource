var Resource = require('./protolus-resource');
var Class = require('Classy');
var less = require('less');

var LessHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('less');
    },
    handle : function(options, callback){
        less.render(options.body, function (e, css) {
            callback(css);
        });
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
Resource.registerHandler('less', new LessHandler());
module.exports = LessHandler;