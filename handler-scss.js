var Resource = require('./protolus-resource');
var Class = require('Classy');
var less = require('less');
var sass = require('node-sass');

var SCSSHandler = new Class({
    Extends : Resource.Handler,
    initialize : function(options){
        this.parent('scss');
    },
    handle : function(options, callback){
        sass.render(options.body, function (err, css) {
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
Resource.registerHandler('scss', new SCSSHandler());
module.exports = SCSSHandler;