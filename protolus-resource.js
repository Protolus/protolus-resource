var ext = require('prime-ext');
var prime = ext(require('prime'));
var Class = require('Classy');
var type = require('prime/util/type');
var string = ext(require('prime/es5/string'));
var array = ext(require('prime/es5/array'));
var fn = require('prime/es5/function');
var regexp = require('prime/es5/regexp');
var Emitter = require('prime/util/emitter');
var fs = require('fs');
var Options = require('prime-ext/options');
var Registry = require('prime-ext/registry');
var Filters = require('prime-ext/filters');
var InternalWorker = require('prime-ext/internal-worker');
require.pkg = require("npm-trospect");
require.scan = require("npm-trospect/scanner");

var Client = function(options){
    if(!Protolus.loaded){
        //bootstrap protolus, so we can ingest packages
        Protolus.packages = ['mootools-core','protolus'];
        Protolus.loaded = {};
        Protolus.scripts = {};
    }
};
Client.require = function(moduleName, callback){
    a = {};
    if(Protolus.scripts[moduleName]){
        if(!Protolus.loaded[moduleName]){
            var module = {};
            var exports = {};
            try{
                eval(Protolus.scripts[moduleName]);
            }catch(ex){
                if(ex.line){
                    window.eh = Protolus.scripts[moduleName];
                    var lines = Protolus.scripts[moduleName].split("\\n");
                    ex.lineText = lines[ex.line];
                }
                console.log('ERROR', ex);
            }
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
};
Client.register = function(name, source){
    if(!Protolus.loaded) Protolus();
    if(name && source){
        var lines = JSON.parse(source);
        Protolus.scripts[name] = lines.join("\n");
    }else{
        //todo: autoregister on pageload
    }
};

var Resource = new Class({
    Implements : [Emitter, Options, InternalWorker],
    initialize : function(options, callback){
        if(typeof options == 'string') options = {name:options};
        if(callback) options.onLoad = callback;
        this.setOptions(options);
        this.registry = this.options.registry || Resource.registry;
        this.addJob();
        this.manifest = require.pkg(this.options.name);
        if(options.name == 'core'){
            this.fileNames = function(fileType, callback){
                if(fileType == 'js') callback(['#core#']);
                else callback([]);
            };
            this.files = function(fileType, callback){
                if(fileType == 'js'){
                    callback([[
                        'var Protolus = '+(Client.toString())+';',
                        'Protolus.require = '+(Client.require.toString())+';',
                        'Protolus.register = '+(Client.register.toString())+';',
                        'window.onload = Protolus;'
                    ].join("\n")]);
                }else callback([]);
            };
            this.removeJob();
            if(this.options.onLoad) this.options.onLoad(this);
        }else{
            if(!this.manifest.autogenerated){
                require.scan.full(this.manifest, fn.bind(function(data){
                        this.removeJob();
                        if(this.options.onLoad) this.options.onLoad(this);
                }, this));
            }else{
                this.removeJob();
                if(this.options.onLoad) this.options.onLoad(this);
            }
        }
        this.registry.register(this.options.name, this);
    },
    dependencyNames : function(fileType, callback){
        this.whenReady(fn.bind(function(){
            var deps = prime.merge(
                this.manifest.scanned_subpackages, 
                prime.keys(this.manifest.merged_dependencies)
            );
            callback(deps);
        }, this));
    },
    fileNames : function(fileType, callback){
        if(type(fileType) == 'function' && !callback){
            callback = fileType;
            delete fileType;
        }
        this.whenReady(fn.bind(function(){
            var resources = this.manifest.resources || [];
            var files = resources.slice(0);
            if(fileType) dependencies = array.filter(files, Filters.fileTypeCaselessLower(fileType));
            callback(files);
        }, this));
    },
    files : function(fileType, callback){
        var handler = Resource.handlers[fileType];
        this.fileNames(fileType, fn.bind(function(fileNames){
            var files = [];
            array.forEachEmission(fileNames, fn.bind(function(fileName, index, returnFn){
                var path = (this.manifest.base_directory+'/'+this.manifest.name+'/'+fileName).replace('/./', '/');
                handler.load(path, fn.bind(function(data){
                    files.push(data);
                    returnFn();
                }, this));
            }, this), function(){
                callback(files, fileNames);
            });
        }, this));
    }
});

Resource.Registry = new Class({ //an instance of this will manage deps for a single instance
    Implements : [Emitter, Options],
    resources : [],
    explicit : [],
    options : {},
    initialize : function(options){
        this.setOptions(options);
    },
    register : function(key, value, callback){
        if(!array.contains(this.resources, key)){
            this.resources.push(key);
            Resource.registry.register(key, value);
        }else if(callback) callback();
    },
    require : function(key){
        if(array.contains(this.resources, key)) return Resource.registry.require(key);
    }
});

Resource.Handler = new Class({
    type : '',
    initialize : function(options){
        if(type(options) == 'string') this.type = options;
    },
    handle : function(options, callback){
        callback(options.body); //passthru
    },
    load : function(location, callback){
        fs.readFile(location, 'utf8', function(err, data){
            if(err) console.log(err, (new Error()).stack);
            callback(data);
        });
    },
    tagProfile : function(){
        return {
            name : '!--',
            attrs : {
            },
            target : 'unknown'
        };
    }
});

Resource.import = function(name, registry, callback, isDependency){
    //console.log('imp', arguments, (new Error()).stack);
    if(type(registry) == 'function' && !callback){
        callback = registry;
        delete registry;
    }
    if(!registry) registry = Resource.registry;
    if(registry.explicit && !isDependency) registry.explicit.push(name)
    var resource;
    var handleDependencies = function(dependencies, callback){
        array.forAllEmissions(dependencies, function(name, index, rtrn){
            Resource.import(name, registry, function(resource){
                rtrn();
            }, true);
        }, function(){
            callback();
        });
    };
    if(!(resource = registry.require(name))){
        //if(!callback) console.log((new Error()).stack)
        new Resource(name, function(resource){
            if(!registry.require(name)){
                registry.register(name, resource);
                if(resource.dependencies) handleDependencies(resource.dependencies, function(){
                    callback(resource);
                });
                else if(callback) callback(resource);
            }else if(callback) callback(registry.require(name));
        })
    }else{
        if(resource.dependencies) handleDependencies(resource.dependencies, function(){
            if(callback) callback(resource);
        });
        else if(callback) callback(resource);
    }
};

Resource.registry = new Registry(); //this is the universal registry, which buffers all instances

var handleExcludes = function(work, registry, excludes, callback){
    if(type(excludes) == 'function' && !callback){
        callback = excludes;
        excludes = [];
    }
    if(!registry) registry = Resource.registry;
    if(!excludes) excludes = [];
    var results = work(registry);
    var filtered = [];
    array.forEach(results, function(result){
        if(!array.contains(excludes, result)) filtered.push(registry.require(result));
    });
    if(callback) callback(filtered);
    return filtered;
}

Resource.explicit = function(registry, excludes, callback){ //just the things we explicitly included
    return handleExcludes(function(registry){
        return registry.explicit || [];
    }, registry, excludes, callback);
}

Resource.includes = function(registry, excludes, callback){
    return handleExcludes(function(registry){
        return registry.resources || prime.keys(registry.registry);
    }, registry, excludes, callback);
}

var assembleAttrs = function(attrs, target, value){
    var attributes = [];
    if(attrs[target]) attrs[target] = attrs[target].replace('{**}');
    else attrs[target] = value;
    prime.each(attrs, function(value, key){
        attributes.push(key+'="'+value+'"');
    });
    return attributes.join(' ');
};

Resource.head = function(options, callback){ //get head
    if(!options.registry) options.registry = Resource.registry;
    var compact = (options.compact === false?'':'/compact');
    var dependencies = (options.dependencies === false?'':'/dependencies');
    var handler = function(resources){
        if(resources.length == 0) callback([]); //we may not have included any
        var tags = ['<script src="/core/"></script>'];
        if(options.inline){
            //todo
            throw('inline not yet implemented.');
        }else{
            var types = prime.keys(Resource.handlers);
            if(options.combined === false){
                array.forEach(resources, function(resource){
                    array.forEach(types, function(type){
                        var tagInfo = Resource.handlers[type].tagProfile();
                        tags.push('<'+tagInfo.name+' '+assembleAttrs(tagInfo.attrs, tagInfo.target, compact+dependencies+'/'+resource.options.name)+'></'+tagInfo.name+'>');
                    });
                });
            }else{
                array.forEach(types, function(type){
                    var tagInfo = Resource.handlers[type].tagProfile();
                    var resList = []
                    array.forEach(resources, function(resource){
                        resList.push(resource.options.name);
                    });
                    tags.push('<'+tagInfo.name+' '+assembleAttrs(tagInfo.attrs, tagInfo.target, '/'+type+compact+dependencies+'/'+resList.join('.'))+'></'+tagInfo.name+'>');
                });
            }
            if(callback) callback(tags);
        }
    };
    var results;
    if(options.dependencies === false && options.explicitDependencies){
        results = Resource.explicit(options.registry, (options.excludes || []), handler);
    }else{
        results = Resource.includes(options.registry, (options.excludes || []), handler);
    }
}

Resource.handle = function(request, response, passthru){
    var url = require('url');
    var uri = url.parse(request.url, true);
    var value;
    var wasResourceRequest = false;
    var optionNames = ['dependencies', 'compact'];
    var handlePath = function(path, resources, options){
        if(path[0] === '/') path = path.substring(1);
        options.type = path.substring(0, path.indexOf('/'));
        path = path.substring(path.indexOf('/')+1);
        while(array.contains(optionNames, path.substring(0, path.indexOf('/')))){
            var opt = path.substring(0, path.indexOf('/'));
            options[opt] = true;
            path = path.substring(path.indexOf('/')+1)
        }
        var resourceNames = path.split(".");
        array.forEach(resourceNames, function(resource){
            resources.push(resource);
        });
    }
    var options = { excludes : [] };
    var resources = [];
    if(uri.pathname === '/core' || uri.pathname.indexOf('/core/') === 0){
        response.writeHead(200);
        response.end([
            'var Protolus = '+(Client.toString())+';',
            'Protolus.require = '+(Client.require.toString())+';',
            'Protolus.register = '+(Client.register.toString())+';',
            'window.onload = Protolus;'
        ].join("\n"));
    }
    if(uri.pathname.indexOf('/main/') === 0){ //commonJS modules need a wrapper
        handlePath(uri.pathname, resources, options);
        var registry = new Resource.Registry();
        var results = [];
        array.forEachEmission(resources, function(name, index, rtrn){
            Resource.import(name, registry, function(resource){
                rtrn();
            });
        }, function(){
            var results = {};
            var resourceList = (options.dependencies ? registry.resources : registry.explicit);
            array.forEachEmission(resourceList, function(resourceName, index, rtrn){
                var resource = registry.require(resourceName);
                var path = resource.manifest.base_directory+'/'+resource.manifest.name+'/'+resource.manifest.main;
                var srcAttr = ' //@sourceURL=/node_modules/'+resource.manifest.name+'/'+resource.manifest.main;
                fs.readFile(path, 'utf8', function(err, body){
                    results[resourceName] = body+'\n'+srcAttr;
                    rtrn();
                });
            }, function(){
                response.writeHead(200);
                var registrations = [];
                prime.each(results, function(js, name){
                    var lines = js.split("\n");
                    var text = JSON.stringify(lines).replace( /\\/g, '\\\\').replace(/'/g, "\\'");
                    registrations.push('Protolus.register(\''+name+'\', \''+text+'\')');
                });
                response.end(registrations.join("\n"));
            });
        });
        wasResourceRequest = true;
    }
    else for(var key in Resource.handlers){
        if(wasResourceRequest) return;
        if(uri.pathname.indexOf('/'+key+'/') === 0){
            handlePath(uri.pathname, resources, options);
            var handler = Resource.handlers[key];
            var registry = new Resource.Registry();
            array.forEachEmission(resources, function(name, index, rtrn){
                Resource.import(name, registry, function(resource){
                    rtrn();
                });
            }, function(){
                var results = [];
                var resourceList = (options.dependencies ? registry.resources : registry.explicit);
                array.forEachEmission(resourceList, function(resourceName, index, rtrn){
                    var resource = registry.require(resourceName);
                    resource.files(key, function(files, fileNames){
                        array.forEach(files, function(file, index){
                            handler.handle({
                                body : file,
                                location : '/node_modules/'+resource.options.name+'/'+fileNames[index],
                                name : resource.options.name,
                                compact : options.compact
                            }, function(result){
                                results.push(result);
                            });
                        });
                        rtrn();
                    });
                }, function(){
                    response.writeHead(200);
                    response.end(results.join("\n"));
                });
            });
            wasResourceRequest = true;
        }
    }
    if(!wasResourceRequest) passthru();
};

Resource.handlers = {};
Resource.registerHandler = function(name, handler){
    Resource.handlers[name] = handler;
};
module.exports = Resource;