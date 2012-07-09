
/**
 * Module dependencies.
 */

var async = require('async')
  , exec = require('child_process').exec
  , express = require('express')
  , io
  , files = {} // Holds info on files currently being uploaded.
  , ffmpeg = require('fluent-ffmpeg')
  , fs = require('fs')
  , models = require('./models')
  , mongoose = require('mongoose')
  , routes = require('./routes')
  , Step = require('step')
  , util = require('util')
  , _ = require('underscore');

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
  this.permanent = false;
 
   /**
   * Check if record for this movie file exists in the database.
   * 
   * Record is check based on file name and file size. 
   * 
   * @param function Next
   *   function called on completion of this method.
   * @return
   *   error - Error object
   *   exists - Boolean denoting is record for this file exists in database.
   *   record - Object containing database record. Only returned if record exists is true. 
   */
  this.exists = function(next) {
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
//        error = new Error('Opps something went wrong.');
        if (error) {
          next(error, undefined);
        }
        else if (results.length === 0) {
          next(null, false);
        }
        else if (results.length === 1) {
          // If contains a record then return that record along with true.
          next(null, true, results[0]);
        }
        else {
          error = new Error('More than one record for this movie record exists.');
          next(error, undefined);
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
  
  this.getAmountUploaded = function() {
    return this.downloaded;
  };
  this.setAmountUploaded = function(amount) {
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
  this.createNewMachineFileName = function() {
    var date = new Date();
    this.machineFileName = date.getTime();
    return this.machineFileName;
  };
  this.getMachineFileName = function() {
    return this.machineFileName;
  };
  this.getId = function() {
    return this.id;
  };
  this.setId = function(id) {
    this.id = id;
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
  
  this.getPermanent = function() {
    return this.permanent;
  };
  
  this.setPermanent = function(value) {
    if (typeof value !== 'boolean') {
      throw error = new Error('Provided argument must be a Boolean.');
    }
    this.permanent = value;
  };
  
  this.save = function() {
    console.log('save file');
    // save movie to database.
    var values = {
      name: this.getName(),
      machineFileName: this.getMachineFileName(),
      originalFileName: this.getName(),
      size: this.getFileSize(),
      type: 'unknown',
//      dateUploaded: Date,
      amountUploaded: this.getAmountUploaded(),
      permanent: this.getPermanent(),
      viewed: 0,
      uid: 0,
      flags: [],
      tags: []
    };
    var movie = new Movie(values);
    movie.save(function(error, data) {
      if (error) {
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
  
  this.update = function(next) {
    if (typeof this.id === 'undefined') {
      var error = new Error('Cannot complete MovieFile.updage as MovieFile.id is not defined.');
      next(error, undefined);
    }
    else {
      var values = {
//          _id: this.getId(),
          name: this.getName(),
          machineFileName: this.getMachineFileName(),
          originalFileName: this.getName(),
          size: this.getFileSize(),
          type: 'unknown',
//          dateUploaded: Date,
          amountUploaded: this.getAmountUploaded(),
          permanent: this.getPermanent(),
          viewed: 0,
          uid: 0,
          flags: [],
          tags: []
        };
//        var movie = new Movie(values);
        var conditions = { _id: this.id };
        var options = {};
        Movie.update(conditions, values, options, function(error, data) {
          if (error) {
            console.log(error);
          }
          else {
            next(null, data);
          }
        });
    }
  };
};

/**
 * Prototype function - Retrieve machine file name from database.
 * 
 * Database is searched based on file name and file size.
 * 
 * @param String name of file
 * @param Number size of file
 * @param Function callback function to call on completion of this function.
 * 
 * @returns
 *   returns error and machine filename to the callback function. If file 
 *   cannot be found the value of filename passed to the callback will be false.
 */
MovieFile.prototype.retrieveMachineFileName = function(filename, filesize, next) {
  // Confirm necessary object variables have been set.
  if (typeof filename !== 'string') {
    throw error = new Error('Valid method argument filename not provided.');
  }
  if (typeof this.fileSize !== 'number') {
    throw error = new Error('Valid method argument filesize not provided.');
  }
  // Check database for existing record.
  Movie
    .find({ originalFileName: filename, size: filesize })
    .exec(function(error, results) {
//      error = new Error('Opps something went wrong.');
      if (error) {
        next(error, undefined);
      }
      else if (results.length === 0) {
        var error = new Error('No record for this file exists in the database.');
        next(null, false);
      }
      else if (results.length === 1) {
        // If contains a record then return that record along with true.
        next(null, results[0].machineFileName);
      }
      else {
        error = new Error('More than one record for this file exists in database.');
        next(error, undefined);
      }
    });
};

/**
 * @param Object options
 *   x - x dimension in pixels.
 *   y - y dimension in pixels.
 *   path - path to which thumbnail should be saved.
 *   
 * @param Function next
 *   Function to call on completion of this function.
 */
MovieFile.prototype.createThumbnail = function(options, next) {
  console.log(this.getMachineFileName());
  // Validate arguments.
  if (typeof options.dimensions === 'undefined') {
    var error = new Error('Must include dimensions for the thumbnail to be generated.');
    next(error, false);
  }
  if (typeof options.path !== 'string') {
    var error = new Error('Must provide a path to which to save the created thumbnail.');
    next(error, false);
  }
  if (typeof this.getMachineFileName() !== 'number') {
    var error = new Error('Cannot create thumb as this file does not have a vaild machine name.');
    next(error, false);
  }
  
  
  // Create thumbnail.
  var machineName = this.getMachineFileName();
  // Remove any leading and trailing forward slashes from path.
  var path = options.path.replace(/^\/|\/$/g, '');
//  var originalXDimension;
//  var originalYDimension;
//  var thumbXDimension;
//  var thumbYDimension;
//  var aspectRatio;
  
//  // Calculate original file dimensions and aspect ratio.
//  Step(
//    function getMovieFileDimensions() {
//      exec("ffmpeg -i " + path + "/" + machineName, this);
//    },
//    function setAspectRatio(err, results) {
//      console.log(results);
//      var regex = /([0-9]{1,4})x([0-9]{1,4})/;
//      var regexMatches = results.match(regex);
//      console.log(regexMatches);
//      var dimensionsString = regexMatches[0].split(/x/i);
//      originalXDimension = Number(dimensionsString[0]);
//      originalYDimension = Number(dimensionsString[1]);
//      aspectRatio = originalXDimension / originalYDimension; 
//      console.log(aspectRatio);
//    }
//  );
  
//  var thumbName = machineName + '_' + thumbXDimension + 'x' + thumbYDimension + '.jpg';
  var dimensions = options.dimensions;
  
  // Set dimensions of thumb.
  var proc = new ffmpeg({ source: path + "/" + machineName, nolog: true })
//  .withSize('150x100')
//  // take 2 screenshots at predefined timemarks
//  .takeScreenshots({ count: 1, timemarks: [ '00:00:02.000', '6' ] }, path, function(err) {
//    console.log('screenshots were saved');
//  });
    .withSize(dimensions)
    .takeScreenshots({ 
        count: 1, 
        timemarks: [ '00:00:02.000' ]
      }, 
      path, 
      function(err, files) {
//        if (err) {
//          next(err, false);
//        }
//        else {
          // Send upload completed response to client.
          next(null, files);
//        }
      });
};



// Set on connection event.
io.sockets.on('connection', function (socket) {
  var Movie = mongoose.model('Movie');
  
  var prepareToUpload = function(file) {
    var machineName = file.getMachineFileName();
    var place = 0;
    try {
      // Is the file already present on server.
      var stat = fs.statSync('temp/' +  machineName);
      if (stat.isFile()) {
        // Update file information with size of already uploaded portion of file.
//        files[name]['downloaded'] = stat.size;
        file.setAmountUploaded(stat.size);
        // Set starting place for continuation of uploading.
        place = stat.size / 524288;
      }
    }
    catch (error) {
      // No file present? Must be a new upload.
      console.log('INFO - No file present, must be new file.');
    } 
    fs.open("temp/" + machineName, "a", 0755, function(error, fd) {
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
    var name = data.name;
    var size = data.fileSize;
    // Create instance of MovieFile object.  
    var movieFile = new MovieFile(mongoose);
    movieFile.setName(name);
    movieFile.setOriginalFileName(name);
    movieFile.setFileSize(size);
    movieFile.setData('');
    movieFile.setAmountUploaded(0);
    // Get the machine name for the file.
    movieFile.exists(function(err, exists, record) {
      if (exists === true && record !== 'undefined') {
        // Is an existing file so get its machine name.
        movieFile.setMachineFileName(record.machineFileName);
        movieFile.setId(record._id);
        console.log(record);
      }
      else {
        // Is a new file so give it a machine name.
        movieFile.createNewMachineFileName();
      }
      //Create a new Entry in The Files Variable.
      var machineName = movieFile.getMachineFileName();
      files[machineName] = movieFile;
      prepareToUpload(files[machineName]);
    });
  });
  
  socket.on('upload', function (data) {
    // Get machine name of file.
    var machineName;
    var file = _.find(files, function(file) {
      if (file.originalFileName === data.name && file.fileSize === data.fileSize) {
        return true;
      }
    });
    machineName = file.machineFileName;

    files[machineName].setAmountUploaded(files[machineName].getAmountUploaded() + data['data'].length);
    // Add data to data buffer.
    files[machineName].setData(files[machineName].getData() + data['data']);
    
    if (files[machineName].getAmountUploaded() == files[machineName].getFileSize())  {
      // File is fully uploaded.
      fs.write(files[machineName].getHandler(), files[machineName].getData(), null, 'binary', function(err, written) {
        // Record file in database.
        files[machineName].exists(function(error, exists, doc) {
          if (error) {
            console.log(error);
          }
          else if (exists === false) {
            // Is a new file, so save it to database.
            files[machineName].save();
          }
          else if (exists === true) {
            // Update existing database record.
//            files[machineName].setAmountUploaded(files[machineName].getAmountUploaded() + files[machineName].getData().length);
            files[machineName].setId(doc._id);
            files[machineName].update(function(error, success) {
              if (error) {
                throw error;
              }
              console.log('Record successfully updated.');
            });
          }
        });
        var input = fs.createReadStream("temp/" + machineName);
        var output = fs.createWriteStream("static/files/" + machineName);
        util.pump(input, output, function(error) {
          // Delete temp media file.
          fs.unlink("temp/" + machineName, function (error) { 
            // Mark file in database as permanent.
            files[machineName].setPermanent(true);
            files[machineName].update(function(error, success) {
              if (error) {
                throw error;
              }
              console.log('Record successfully updated.');
            });
            // Create thumbnails.
            var options = {
              path: '/static/files',
              dimensions: '300x?'
            };
            files[machineName].createThumbnail(options, function(error, thumbName) {
              if (error) {
                throw error;
              }
              else {
             // Move file completed.  Can now generate thumbnail.
                socket.emit('done', {'image' : 'files/' + thumbName});
              }
            });
            
          });
        });
      });
    }
    else if (files[machineName].getData().length > 10485760) { 
      // Data Buffer is full (has reached 10MB) proceed to write buffer to file on server.
      fs.write(files[machineName].getHandler(), files[machineName].getData(), null, 'binary', function(err, written) {
        // Record file in database.
        files[machineName].exists(function(error, exists, doc) {
          if (error) {
            console.log(error);
          }
          else if (exists === false) {
            // Is a new file, so save it to database.
            files[machineName].save();
          }
          else if (exists === true) {
            // Update existing database record.
//            files[machineName].setAmountUploaded(files[machineName].getAmountUploaded() + files[machineName].getData().length);
            files[machineName].setId(doc._id);
            files[machineName].update(function(error, success) {
              if (error) {
                throw error;
              }
              console.log('Record successfully updated.');
            });
          }
        });
        
        //Reset The Buffer
        files[machineName].setData('');
        // Get current upload position.
        var place = files[machineName].getAmountUploaded() / 524288;
        // Get current percentage upload completed.
        var percent = (files[machineName].getAmountUploaded() / files[machineName].getFileSize()) * 100;
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
      var place = files[machineName].getAmountUploaded() / 524288;
      // Get current percentage upload completed.
      var percent = (files[machineName].getAmountUploaded() / files[machineName].getFileSize()) * 100;
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
