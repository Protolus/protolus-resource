protolus-resource.js
===========

A Node.js resource layer for dynamic bundling of npm modules and embedded resources(such as js, css, images, less...) supporting dependencies. 

Server Side
-----------
First require the module:

    var resource = require('protolus-resource');
    
Then, to actually register a resource:

    resource('my_npm_module', function(moduleResources){
        //all done
    });

once you've done this you can access all the included resources, with or without dependencies

    var resourceList = resource.allResources();
    var fullResourceList = resource.allResourcesWithDependencies();
    
you'll need this to generate your own URL back to fetch the right resource bundle, each filetype can be requested from from it's own endpoint, for example to request the js files from the 'my_npm_module' npm module I would use:

    '/js/my_npm_module'

if I wanted it minified with npm module 'another_module':

    '/js/compact/my_npm_module.another_module'
    
I'd produce a url like that after having used resource() on the modules I need:

    var location = '/js/compact/'+resource.allResourcesWithDependencies().join('.');
    
or I can get an array of head tags, after resources are registered, using resource.headIncludes(<options>, <callback>) where options may be a complex object or a boolean representing the 'combined' option.
- *combined* : are the resources a series of sequential tags or one large combined one?
- *compact* : are the resources built uncompressed, or are they minified/compacted/etc. ?

        resource.headIncludes(true, function(tags){
            res.end('<html><head>(tags.join("\n"))+'</head><body><h1>Heya!</h1></body></html>');
        });

On the other side of things, in your server, theres a passthrough for handling the serving of all these resources which we can use to put it all together:

    var app = require('http').createServer(function handler(req, res) {
        resource.handleResourceCalls(req, res, function(){
            resource('test-component', function(){
                resource.headIncludes(true, function(tags){
                    res.end('<html><head>'+(tags.join("\n"))+'</head><body><h1>Heya!</h1></body></html>');
                }); 
            });
        });
    });
    app.listen(80);
    
Then we can get combined payloads into the browser without committing to a build process or async loading every required module individually.

Client Side
-----------

In the browser you get an already built-in 'core' which includes 3 targets:

    Protolus()
    
This simply initializes Protolus, this function is called implicitly by Protolus.register() if it has not already been called.

    Protolus.register(<name>, <code>);
    
This function preregisters a block of code to some module name for later requiring

    Protolus.require(<name>, [<callback>]);
    
which you will likely want to take over 'require', unless you are using 2 loaders (which is, to be fair, probably crazy).

    window.require = Protolus.require;
    
This gives us a require shim that supports both the CommonJS and (eventually) AMD style of declaration because we can guarantee module load in the head so at runtime everything is there... no need for anything synchronous or incompatible.

Additionally all js in package.resources are executed in a global scope, the way you are used to, so client-side scripts can just drop in without wrappering them through CommonJS when they aren't being executed server side.

Enjoy,

-Abbey Hawk Sparrow