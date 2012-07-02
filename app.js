
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , io
  , files = {} // Holds info on files currently being uploaded.
  , fs = require('fs')
  , exec = require('child_process').exec
  , util = require('util');

var app = module.exports = express.createServer();

/* 
 * Configuration
 */

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

/*
 * Socket.io events
 */

// Initialize socket.io.
io = require('socket.io').listen(app);

// Set on connection event.
io.sockets.on('connection', function (socket) {
  
  // Start uploading process
  //   @param data contains the variables passed through from the html file.
  socket.on('start', function (data) { 
    var name = data['name'];
    //Create a new Entry in The Files Variable.
    files[name] = {  
      fileSize: data['size'],
      data: '',
      downloaded: 0
    };
    var place = 0;
    try {
      // Is the file already present on server.
      var stat = fs.statSync('temp/' +  name);
      if (stat.isFile()) {
        // Update file information with size of already uploaded portion of file.
        files[name]['downloaded'] = stat.size;
        // Set starting place for continuation of uploading.
        place = stat.size / 524288;
      }
    }
    catch (er) {
      // No file present? Must be a new upload.
    } 
    fs.open("temp/" + name, "a", 0755, function(err, fd) {
      if (err) {
         console.log(err);
      }
      else {
        // Store file handler so can be written to later.
        files[name]['handler'] = fd; 
        // Fetch file data from client. 
        socket.emit('moreData', { 
          'place': place, 
          percent: 0 
        });
      }
    });
  });
  
  socket.on('upload', function (data) {
    var name = data['name'];
    files[name]['downloaded'] += data['data'].length;
    files[name]['data'] += data['data'];
    if (files[name]['downloaded'] == files[name]['fileSize'])  {
      // File is Fully Uploaded.
      fs.write(files[name]['handler'], files[name]['data'], null, 'binary', function(err, writen) {
        // Get Thumbnail here.
      });
    }
    else if (files[name]['data'].length > 10485760) { 
      // Data Buffer has reached 10MB.
      fs.write(files[name]['handler'], files[name]['data'], null, 'binary', function(err, writen) {
        //Reset The Buffer
        files[name]['data'] = ""; 
        var place = files[name]['downloaded'] / 524288;
        var percent = (files[name]['downloaded'] / files[name]['fileSize']) * 100;
        socket.emit('moreData', { 
          'place': place, 
          'percent':  percent 
        });
      });
    }
    else {
      var place = files[name]['downloaded'] / 524288;
      var percent = (files[name]['downloaded'] / files[name]['fileSize']) * 100;
      socket.emit('moreData', { 
        'place': place, 
        'percent': percent
      });
    }
  });
});

/*
 * Routes
 */ 

app.get('/', routes.index);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
