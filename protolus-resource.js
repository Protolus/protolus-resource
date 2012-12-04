//todo: events support
var prime = require('prime');
var Class = require('Classy');
var type = require('prime/util/type');
var array = require('prime/es5/array');
array.forEachEmission = function(collection, callback, complete){ //one at a time
    var a = {count : 0};
    var fn = function(collection, callback, complete){
        if(a.count >= collection.length){
            if(complete) complete();
        }else{
            callback(collection[a.count], a.count, function(){
                a.count++;
                fn(collection, callback, complete);
            });
        }
    };
    fn(collection, callback, complete);
};
array.forAllEmissions = function(collection, callback, complete){ //parallel
    var a = {count : 0};
    var begin = function(){
        a.count++;
    };
    var finish = function(){
        a.count--;
        if(a.count == 0 && complete) complete();
    };
    array.forEach(collection, function(value, key){
        begin();
        callback(value, key, function(){
           finish(); 
        });
    });
};
var fn = require('prime/es5/function');
var regexp = require('prime/es5/regexp');
var Emitter = require('prime/util/emitter');
var fs = require('fs');

var Options = new Class({
    setOptions : function(options){
        if(!this.options) this.options = {};
        var value;
        for(key in options){
            value = options[key];
            if(this.on && key.substring(0,2) == 'on' && key.substring(2,3) == key.substring(2,3).toUpperCase()){
                var event = key.substring(2,3).toLowerCase()+key.substring(3);
                this.on(event, value);
            }
            this.options[key] = value;
        }
    }
});

var ProtolusResource = new Class({
    Implements : [Emitter, Options],
    options : {
        remote : true,
        location : '.'
    },
    cache : {
        
    },
    initialize : function(options, callback){
        if(type(options) == 'string') options = {name:options};
        if(!options) options = {};
        if(!options.name) throw('Unrecognized Options');
        this.setOptions(options);
        if(!this.options.remote){ //we want to locally load this file
            this.exported = require(this.options.name);
        }
        this.package = require(this.options.name+'/package');
        callback(this);
    },
    fileNames : function(fileType, callback){
        var result = [];
        array.forEach(this.package.resources, function(resource){
            if(type(resource) == 'string') resource = {name:resource};
            if(resource.name.lastIndexOf('.') == -1) return; //no type, skip it
            var resourceType = resource.name.substring(resource.name.lastIndexOf('.')+1);
            if(resourceType.toLowerCase() == fileType.toLowerCase()) result.push(resource.name);
        });
        callback(result);
    },
    getPath : function(name){ //this is an evil synchronous function
        var result;
        array.forEach(process.mainModule.paths, function(path){
            var fullPath = path+'/'+name;
            if(fs.existsSync(fullPath) && !result) result = fullPath;
        });
        if(!result) throw('no path found for module "'+name+'"!');
        return result;
    },
    files : function(fileType, callback){
        var handler = ProtolusResource.handlers[fileType];
        var location = this.options.location;
        var compact = this.options.compact;
        var modulePath = this.getPath(this.options.name);
        this.fileNames(fileType, fn.bind(function(fileNames){
            var files = [];
            array.forEachEmission(fileNames, fn.bind(function(fileName, index, returnFn){
                var path = modulePath+'/'+fileName;
                handler.load(path, function(data){
                    handler.handle({
                        body : data,
                        location : path,
                        name : fileName,
                        compact : compact
                    }, function(result){
                        files.push(result);
                        returnFn();
                    });
                });
            }, this), function(){
                callback(files);
            });
        }, this));
    },
    resource : function(name){
        
    }
});

ProtolusResource.Handler = new Class({
    type : '',
    initialize : function(options){
        if(type(options) == 'string') this.type = options;
    },
    handle : function(options, callback){
        callback(options.body); //passthru
    },
    load : function(location, callback){
        fs.readFile(location, 'utf8', function(err, data){
            if(err) throw(err);
            callback(data);
        });
    }
});

ProtolusResource.JavascriptHandler = new Class({
    Extends : ProtolusResource.Handler,
    initialize : function(options){
        this.parent('js')
    },
    handle : function(options, callback){
        options.body += "\n"+' //@ sourceURL='+options.location+"\n"
        callback(options.body);
    }
    //todo: optionaly prescan load for 'requires'
    
});

ProtolusResource.handlers = {};
ProtolusResource.handlers['css'] = new ProtolusResource.Handler('css');
ProtolusResource.handlers['js'] = new ProtolusResource.JavascriptHandler();

var registry = {};
var includes = [];
var resources = [];
var import_resource = function(name, callback){
    resources.push(name);
    new ProtolusResource(name, function(resource){
        registry[name] = resource;
        var count = 0;
        array.forEach(resource.package.dependencies, function(dependency){
            count++;
            import_resource(dependency, function(){
                count--;
                if(count == 0) callback();
            })
        });
        if(count == 0) callback();
    });
}
module.exports = function(name, callback){
    if(!registry[name]){
        includes.push(name);
        import_resource(name, callback)
    } else if(callback) callback(registry[name]);
};
module.exports.Resource = ProtolusResource;
module.exports.allResources = function(type, callback){
    callback(includes);
}
module.exports.allResourcesWithDependencies = function(type, callback){
    callback(resources);
}
module.exports.handleResourceCalls = function(request, response, passthru){
    var url = require('url');
    var uri = url.parse(request.url, true);
    var value;
    var wasResourceRequest = false;
    for(key in ProtolusResource.handlers){
        if(wasResourceRequest) return;
        if(uri.pathname.indexOf('/'+key+'/') === 0){
            var rem = uri.pathname.substring(('/'+key+'/').length);
            var resources = rem.split(".");
            var results = [];
            var resource;
            array.forEachEmission(resources, function(name, index, returnFn){
                resource = registry[name];
                resource.files(key, function(files){
                    array.forEach(files, function(file){
                        results.push(file);
                    });
                    returnFn();
                })
            }, function(){
                response.writeHead(200);
                response.end(results.join("\n"));
            });
            wasResourceRequest = true;
        }
    }
    if(!wasResourceRequest) passthru();
}