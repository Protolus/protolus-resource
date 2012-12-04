protolus-resource.js
===========

A Node.js resource layer for dynamic bundling of npm modules and embedded resources(such as js, css, images, less...) supporting dependencies. 

Usage
-----
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

    /js/my_npm_module

if I wanted it minified with npm module 'another_module':

    /js/compact/my_npm_module.another_module
    
I'd produce a url like that after having used resource() on the modules I need:

    var location = '/js/compact/'+resource.allResourcesWithDependencies().join('.');

On the other side of things, in your server, theres a passthrough for handling the serving of all these resources:

    var app = require('http').createServer(function handler(req, res) {
        resource.handleResourceCalls(req, res, function(){
            //serve a page
        });
    });
    app.listen(80);
    
Then we can get combined payloads into the browser without committing to a build process or async loading every required module individually.
    
Enjoy,

-Abbey Hawk Sparrow