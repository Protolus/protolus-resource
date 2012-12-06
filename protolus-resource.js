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
        for(var key in options){
            value = options[key];
            if(this.on && key.substring(0,2) == 'on' && key.substring(2,3) == key.substring(2,3).toUpperCase()){
                var event = key.substring(2,3).toLowerCase()+key.substring(3);
                this.on(event, value);
            }
            this.options[key] = value;
        }
    }
});

var Protolus = function(options){
    if(!Protolus.loaded){
        //bootstrap protolus, so we can ingest packages
        Protolus.packages = ['mootools-core','protolus'];
        Protolus.loaded = {};
        Protolus.scripts = {};
    }
}

Protolus.require = function(moduleName, callback){
    a = {};
    if(Protolus.scripts[moduleName]){
        if(!Protolus.loaded[moduleName]){
            var module = {};
            var exports = {};
            eval(Protolus.scripts[moduleName]);
            Protolus.loaded[moduleName] = module.exports || exports;
            if(callback) callback(Protolus.loaded[moduleName]);
            else return Protolus.loaded[moduleName];
        }else{
            if(callback) callback(Protolus.loaded[moduleName]);
            else return Protolus.loaded[moduleName];
        }
    }else{
        throw('Unloaded Module:'+moduleName+'!');
        //todo: async load
        return function(callback){
            if(callback) a.callback = callback;
            return a.response || false;
        };
    }
}

Protolus.register = function(name, source){
    if(!Protolus.loaded) Protolus();
    if(name && source){
        Protolus.scripts[name] = source;
    }else{
        //todo: autoregister on pageload
    }
};

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
        if(options.name == 'core'){
            this.fileNames = function(fileType, callback){
                var result = [];
                if(fileType == 'js'){
                    result.push('#core#');
                }
                callback(result);
            };
            this.files = function(fileType, callback){
                var result = [];
                if(fileType == 'js'){
                    result.push([
                        'var Protolus = '+(Protolus.toString())+';',
                        'Protolus.require = '+(Protolus.require.toString())+';',
                        'Protolus.register = '+(Protolus.register.toString())+';',
                        'window.onload = Protolus;'
                    ].join("\n"));
                }
                callback(result);
            };
        }else{
            if(!this.options.remote){ //we want to locally load this file
                this.exported = require(this.options.name);
            }
            this.package = require(this.options.name+'/package');
        }
        callback(this);
    },
    fileNames : function(fileType, callback){
        var result = [];
        var process = function(resource){
            if(type(resource) == 'string') resource = {location:resource};
            if(resource.location.lastIndexOf('.') == -1) return; //no type, skip it
            var resourceType = resource.location.substring(resource.location.lastIndexOf('.')+1);
            if(resourceType.toLowerCase() == fileType.toLowerCase()) result.push(resource.location);
        };
        if(fileType == 'main') result.push(this.package.main);
        else array.forEach(this.package.resources, function(resource){
            if(type(resource) == 'string') resource = {location:resource};
            if(resource.location.lastIndexOf('.') == -1) return; //no type, skip it
            var resourceType = resource.location.substring(resource.location.lastIndexOf('.')+1);
            if(resourceType.toLowerCase() == fileType.toLowerCase()) result.push(resource.location);
        } );
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
        var moduleName = this.options.name;
        this.fileNames(fileType, fn.bind(function(fileNames){
            var files = [];
            array.forEachEmission(fileNames, fn.bind(function(fileName, index, returnFn){
                var path = modulePath+'/'+fileName;
                handler.load(path, function(data){
                    handler.handle({
                        body : data,
                        location : path,
                        name : moduleName,
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

ProtolusResource.JavascriptMainHandler = new Class({
    Extends : ProtolusResource.Handler,
    initialize : function(options){
        this.parent('js')
    },
    handle : function(options, callback){
        var text = options.body.replace( /\n/g, ' ').replace( /\\/g, '\\\\').replace(/'/g, "\\'");
        options.body = 'Protolus.register(\''+options.name+'\', \''+text+'\')';
        options.body += "\n"+' //@ sourceURL='+options.location+"\n"
        callback(options.body);
    }
    //todo: optionaly prescan load for 'requires'
    
});

ProtolusResource.handlers = {};
ProtolusResource.handlers['css'] = new ProtolusResource.Handler('css');
ProtolusResource.handlers['js'] = new ProtolusResource.JavascriptHandler();
ProtolusResource.handlers['main'] = new ProtolusResource.JavascriptMainHandler();

var registry = {};
var includes = [];
var resources = [];
var import_resource = function(name, callback){
    resources.push(name);
    new ProtolusResource(name, function(resource){
        registry[name] = resource;
        var count = 0;
        if(resource.package) array.forEach(resource.package.dependencies, function(dependency){
            count++;
            import_resource(dependency, function(){
                count--;
                if(count == 0) callback(resource);
            })
        });
        if(count == 0) callback(resource);
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
module.exports.headIncludes = function(options, callback){
    if(typeof options == 'boolean') options = {combined : options};
    var res = module.exports;
    tags = [];
    var compact = options.compact?'/compact':'';
    var handleTags;
    if(options.combined){
        handleTags = function(names, tag, attr, type){
            tags.push('<'+tag+' '+attr+'="/'+type+compact+'/'+(names.join("."))+'"></'+tag+'>');
        };
    }else{
        handleTags = function(names, tag, attr, type){
            for(var index in names){
                tags.push('<'+tag+' '+attr+'="/'+type+compact+'/'+(names[index])+'"></'+tag+'>');
            }
        };
    }
    handleTags(['core'], 'script', 'src', 'js');
    res.allResourcesWithDependencies('main', function(mainScriptNames){
        handleTags(mainScriptNames, 'script', 'src', 'main');
        res.allResourcesWithDependencies('css', function(styleNames){
            handleTags(styleNames, 'link', 'href', 'css');
            res.allResourcesWithDependencies('js', function(scriptNames){
                handleTags(scriptNames, 'script', 'src', 'js');
                callback(tags);
            });
        });
    });
    /*if(options.combined){
        res.allResourcesWithDependencies('main', function(mainScriptNames){
            if(options.core !== false) mainScriptNames.unshift('core');
            tags.push('<script src="/main'+compact+'/'+(mainScriptNames.join("."))+'"></sc'+'ript>');
            res.allResourcesWithDependencies('css', function(styleNames){
                tags.push('<link href="/css'+compact+'/'+(styleNames.join("."))+'"></link>');
                res.allResourcesWithDependencies('js', function(scriptNames){
                    tags.push('<script src="/js'+compact+'/'+(scriptNames.join("."))+'"></sc'+'ript>');
                    callback(tags);
                });
            });
        });
    }else{
        res.allResourcesWithDependencies('main', function(mainScriptNames){
            if(options.core !== false) mainScriptNames.unshift('core');
            for(var index in mainScriptNames){
                tags.push('<script src="/main'+compact+'/'+(mainScriptNames[index])+'"></sc'+'ript>');
            }
            res.allResourcesWithDependencies('css', function(styleNames){
                for(var index in styleNames){
                    tags.push('<link href="/css'+compact+'/'+(styleNames[index])+'"></link>');
                }
                res.allResourcesWithDependencies('js', function(scriptNames){
                    for(var index in scriptNames){
                        tags.push('<script src="/js'+compact+'/'+(scriptNames[index])+'"></sc'+'ript>');
                    }
                    callback(tags);
                });
            });
        });
    }*/
}
module.exports.allResourcesWithDependencies = function(type, callback){
    callback(resources);
}
module.exports.handleResourceCalls = function(request, response, passthru){
    var url = require('url');
    var uri = url.parse(request.url, true);
    var value;
    var wasResourceRequest = false;
    for(var key in ProtolusResource.handlers){
        if(wasResourceRequest) return;
        if(uri.pathname.indexOf('/'+key+'/') === 0){
            var rem = uri.pathname.substring(('/'+key+'/').length);
            var resources = rem.split(".");
            var results = [];
            array.forEachEmission(resources, function(name, index, returnFn){
                import_resource(name, function(resource){
                    resource.files(key, function(files){
                        array.forEach(files, function(file){
                            results.push(file);
                        });
                        returnFn();
                    });
                });
            }, function(){
                response.writeHead(200);
                response.end(results.join("\n"));
            });
            wasResourceRequest = true;
        }
    }
    if(!wasResourceRequest) passthru();
}