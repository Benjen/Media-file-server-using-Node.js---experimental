
/**
 * Module dependencies.
 */

var async = require('async')
  , express = require('express')
  , routes = require('./routes')
  , io
  , files = {} // Holds info on files currently being uploaded.
  , fs = require('fs')
  , models = require('./models')
  , mongoose = require('mongoose')
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
  app.set('db-uri', 'mongodb://localhost/media-server');
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

/*
 * Database models
 */ 

models.defineModels(mongoose, function() {
  app.User = User = mongoose.model('User');
  app.Movie = Movie = mongoose.model('Movie');
  db = mongoose.connect(app.set('db-uri'));
});

/*
 * Socket.io events
 */

// Initialize socket.io.
io = require('socket.io').listen(app);

/**
 * 
 */
function MovieFile(mongoose) {
  var Movie = mongoose.model('Movie');
  this.id;
  this.name;
  this.data;
  this.downloaded;
  this.handler;
  this.fileSize = 0;
  this.machineFileName;
//  this.Movie = mongoose.model('Movie');
  this.originalFileName;
  this.exists = function(fn) {
    // Confirm necessary object variables have been set.
    if (typeof this.originalFileName === 'undefined') {
      throw error = new Error('Variable originalFilename has not been set for MovieFile.');
    }
    if (typeof this.fileSize !== 'number') {
      throw error = new Error('Variable originalFilename has not been set for MovieFile.');
    }
    // Check database for existing record.
    Movie
      .find({ originalFileName: this.originalFileName, size: this.fileSize })
      .exec(function(error, results) {
        if (error) {
          throw error;
        }
        if (results.length === 0) {
          return false;
        }
        else if (results.length === 1) {
          return true;
        }
        else {
          throw error = new Error('More than one record for this movie record exists.');
        }
      });
  };
  this.fetch = function(name, size) {};
  this.getData = function() {
    return this.data;
  };
  this.setData = function(data) {
    this.data = data;
  };
  this.getDownloaded = function() {
    return this.downloaded;
  };
  this.setDownloaded = function(amount) {
    this.downloaded = amount;
  };
  this.getFileSize = function() {
    return this.fileSize;
  };
  this.setFileSize = function(size) {
    this.fileSize = size;
  };
  this.getHandler = function() {
    return this.handler;
  };
  this.setHandler = function(handler) {
    this.handler = handler;
  };
  this.getMachineFileName = function() {
    return this.machineFileName;
  };
  this.setMachineFileName = function(machineFileName) {
    this.machineFileName = machineFileName;
  };
  this.getName = function() {
    return this.name;
  };
  this.setName = function(name) {
    this.name = name;
  };
  this.getOriginalFileName = function() {
    return this.originalFileName;
  };
  this.setOriginalFileName = function(originalFileName) {
    this.originalFileName = originalFileName;
  };  
  this.save = function() {
    // save movie to database.
    var values = {
      name: this.getName(),
      machineFileName: this.getMachineFileName(),
      originalFileName: this.getName(),
      size: this.getFileSize(),
      type: 'unknown',
//      dateUploaded: Date,
      amountUploaded: this.getDownloaded(),
      viewed: 0,
      uid: 0,
      flags: [],
      tags: []
    };
//    var Movie = mongoose.model('Movie');
    var movie = new Movie(values);
    movie.save(function(error, data) {
      if (error) {
        console.log('**** Error saving movie info to database. ****');
        console.log(error);
      }
      else {
        console.log('Movie saved.');
      }
    });
  };
  this.refresh = function() {
    // Refresh movie with values from database.
  };
};

// Set on connection event.
io.sockets.on('connection', function (socket) {
  var Movie = mongoose.model('Movie');
  
  var prepareToUpload = function(file) {
    var name = file.getName();
    var place = 0;
    try {
      // Is the file already present on server.
      var stat = fs.statSync('temp/' +  name);
      if (stat.isFile()) {
        // Update file information with size of already uploaded portion of file.
//        files[name]['downloaded'] = stat.size;
        file.setDownloaded(stat.size);
        // Set starting place for continuation of uploading.
        place = stat.size / 524288;
      }
    }
    catch (error) {
      // No file present? Must be a new upload.
      console.log('INFO - No file present, must be new file.');
    } 
    fs.open("temp/" + name, "a", 0755, function(error, fd) {
      if (error) {
         console.log(error);
      }
      else {
        // Store file handler so can be written to later.
//        files[name]['handler'] = fd; 
        file.setHandler(fd);
        // Add record of file to database.
//        file.save();
        // Fetch file data from client. 
        socket.emit('moreData', { 
          'place': place, 
          percent: 0 
        });
      }
    });
  };
  
  // Start uploading process
  //   @param data contains the variables passed through from the html file.
  socket.on('start', function (data) { 
    var name = data['name'];
    var size = data['size'];
    // Create instance of MovieFile object.  
    var movieFile = new MovieFile(mongoose);
    movieFile.setName(name);
    movieFile.setOriginalFileName(name);
    movieFile.setFileSize(size);
    movieFile.setData('');
    movieFile.setDownloaded(0);
    if (movieFile.exists() === true) {
      // Fetch existing database record.
      console.log(movieFileExists);
    }
    else {
      console.log('Database record not found.');
      var date = new Date();
      movieFile.setMachineFileName(date.getTime());
    }
    // Check if file already exists.
//    Movie
//      .find({ originalFileName: name, size: size })
//      .exec(function(error, results) {
//        if (results.length === 0) {
//          // Movie does not exist. 
//          movieFile.setName(name);
//          movieFile.setFileSize(size);
//          movieFile.setData('');
//          movieFile.setDownloaded(0);
//        }
//        else {
//          // Movie exists.  Update based on values stored in database.
//          movieFile.setName(results[0].name);
//          movieFile.setFileSize(results[0].size);
//          movieFile.setData('');
//          movieFile.setDownloaded(0);
//        }
//      });
    //Create a new Entry in The Files Variable.
    files[name] = movieFile;
//    files[name] = {  
//      fileSize: data['size'],
//      data: '',
//      downloaded: 0
//    };
    prepareToUpload(files[name]);
  });
  
  socket.on('upload', function (data) {
    var name = data['name'];
    files[name].setDownloaded(files[name].getDownloaded() + data['data'].length);
    // Add data to data buffer.
    files[name].setData(files[name].getData() + data['data']);
    
    if (files[name].getDownloaded() == files[name].getFileSize())  {
      // File is fully uploaded.
      fs.write(files[name].getHandler(), files[name].getData(), null, 'binary', function(err, written) {
        var input = fs.createReadStream("temp/" + name);
        var output = fs.createWriteStream("static/files/" + name);
        util.pump(input, output, function(){
          // Delete temp media file.
          fs.unlink("temp/" + name, function () { 
            // Move file completed.  Can now generate thumbnail.
            exec("ffmpeg -i static/files/" + name  + " -ss 01:30 -r 1 -an -vframes 1 -f mjpeg static/files/" + name  + ".jpg", function(err) {
              if (err) {
                console.log('Error creating thumbnail: ' + err.message);
              }
              else {
                console.log('Video thumbnail created.');
                // Send upload completed response to client.
                socket.emit('done', {'image' : 'files/' + name + '.jpg'});
              }
           });
          });
        });
      });
    }
    else if (files[name].getData().length > 10485760) { 
      // Data Buffer is full (has reached 10MB) proceed to write buffer to file on server.
      fs.write(files[name].getHandler(), files[name].getData(), null, 'binary', function(err, written) {
        // Update file record in database.
        if (files[name].exists() === false) {
          files[name].save();
        }
        
        //Reset The Buffer
        files[name].setData('');
        // Get current upload position.
        var place = files[name].getDownloaded() / 524288;
        // Get current percentage upload completed.
        var percent = (files[name].getDownloaded() / files[name].getFileSize()) * 100;
        // Send request to client for more file data.
        socket.emit('moreData', { 
          'place': place, 
          'percent':  percent 
        });
      });
    }
    else {
      // Data buffer is not full. Get next packet of data from client.
      // Get current upload position.
      var place = files[name].getDownloaded() / 524288;
      // Get current percentage upload completed.
      var percent = (files[name].getDownloaded() / files[name].getFileSize()) * 100;
      // Send request to client for more file data.
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
