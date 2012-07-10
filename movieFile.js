/**
 * 
 */
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var mongoose = require('mongoose');

function MovieFile(mongoose) {
  var Movie = mongoose.model('Movie');
  this.id;
  this.name;
  this.data;
  this.dateUploaded;
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
  
  this.getDateUploaded = function() {
    return this.dateUploaded;
  };
  
  this.setDateUploaded = function(date) {
    this.dateUploaded = date;
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
};

/**
 * Create thumbnail for movie file
 * 
 * @param Object options
 *   options.dimensions - String denoting dimensions of the thumbnail. 
 *   Example of dimension options include: 320x? - Fixed width, 
 *   calculate height; ?x240 - Fixed height, calculate width; 50% - 
 *   percental resizing; 320x240 - fixed size (plain ffmpeg way).
 *
 *   path - String denoting path to which thumbnail should be saved.
 *   
 * @param Function next
 *   Function to call on completion of this function.
 */
MovieFile.prototype.createThumbnail = function(options, next) {
  // Validate arguments.
  if (typeof options.dimensions === 'undefined') {
    var error = new Error('Must include dimensions for the thumbnail to be generated.');
    next(error, false);
  }
  if (typeof options.path !== 'string') {
    var error = new Error('Must provide a path to which to save the created thumbnail.');
    next(error, false);
  }
  if (typeof this.getMachineFileName() === 'undefined') {
    var error = new Error('Cannot create thumb as this file does not have a vaild machine name.');
    next(error, false);
  }
  
  // Create thumbnail.
  var machineName = this.getMachineFileName();
  // Remove any leading and trailing forward slashes from path.
  var path = options.path.replace(/^\/|\/$/g, '');
  var dimensions = options.dimensions;
  
  // Set dimensions of thumb.
  var proc = new ffmpeg({ source: path + "/" + machineName, nolog: true })
    .withSize(dimensions)
    .takeScreenshots({ 
        count: 1, 
        timemarks: [ '30' ],
        filename: machineName + '_%r'
      }, 
      path, 
      function(err, files) {
        // Send response to callback function.
        console.log(files);
        next(err, files);
      });
};

/**
 * Remove movie file from server and database
 */
MovieFile.prototype.remove = function(next) {
  if (typeof this.getId() === 'undefined') {
    var error = new Error('MovieFile.id has not been set for this object.');
    next(error);
  }
  // Remove file from server.
  fs.unlink(file, function(err, result) {
    // Remove file record from database.
    Movie.remove({ _id: id }, function(err, result) {
      if (err) {
        next(err);
      }
      else {
        console.log('File record removed from database.');
        next(null, result);
      }
    });
  });
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
 * Save record of movie file to database
 */
MovieFile.prototype.save = function(next) {
  console.log('save file');
  // save movie to database.
  var values = {
    name: this.getName(),
    machineFileName: this.getMachineFileName(),
    originalFileName: this.getName(),
    size: this.getFileSize(),
    type: 'unknown',
    dateUploaded: this.getDateUploaded(),
    amountUploaded: this.getAmountUploaded(),
    permanent: this.getPermanent(),
    viewed: 0,
    uid: 0,
    flags: [],
    tags: []
  };
  var movie = new Movie(values);
  movie.save(function(err, data) {
    if (err) {
      next(err);
    }
    else {
      console.log(typeof next);
      next(null, data);
    }
  });
};

/**
 * Update database record for this movie file
 * 
 * @param next
 *   Function to call after completing this operation.
 */
MovieFile.prototype.update = function(next) {
  if (typeof this.id === 'undefined') {
    var error = new Error('Cannot complete MovieFile.updage as MovieFile.id is not defined.');
    next(error, undefined);
  }
  else {
    var conditions = { _id: this.id };
    var values = {
//        _id: this.getId(),
        name: this.getName(),
        machineFileName: this.getMachineFileName(),
        originalFileName: this.getName(),
        size: this.getFileSize(),
        type: 'unknown',
        dateUploaded: this.getDateUploaded(),
        amountUploaded: this.getAmountUploaded(),
        permanent: this.getPermanent(),
        viewed: 0,
        uid: 0,
        flags: [],
        tags: []
      };
      var options = {};
      Movie.update(conditions, values, options, function(err, data) {
        if (err) {
          next(err, data);
        }
        else {
          next(null, data);
        }
      });
  }
};

var TrashCollector = function() {
  var Movie = mongoose.model('Movie');
  this.files = new Array();
  this.tempPath = '';
  this.timeLimit = 0;
  this.opCompleted = true;
  
  /*
   * Init function
   * 
   * @param options
   *   tempPath: (String) path of temp storage directory.
   *   interval: (Number) interval, in seconds, for running trash collection functions.
   *   timeLimit: (Number) length of time temporary files will remain on server.
   */
  this.init= function(options) {
    var self = this;
    this.tempPath = options.tempPath || './temp';
    // Set interval for trash collecting in seconds (default 6 hours)
    this.interval = options.interval || 21600;
    // Set the time limit (in milliseconds) for which temporary file will be removed from server.
    this.timeLimit = options.timeLimit * 60 * 1000 || 0;
    setInterval(function() {
      // Only run if previous call has completed. Prevents multiple 
      // overlapping runs of same function.
      if (self.opCompleted === true) {
        self.opCompleted = false;
        self.scanForOrphanedFiles();
      }
    }, this.interval * 1000);
  };
  
  /** 
   * Detects files in temp directory which do not have corresponding database record (e.g. are orphaned)
   */
  this.scanForOrphanedFiles = function() {
    var self = this;
    // Get list of files in temp directory.
    this.files = fs.readdir(this.tempPath, function(err, files) {
      // Check if files have record in database.
      Movie
        .where('machineFileName').in(files)
        .exec(function(err, docs) {
          // Remove record and file if file is older than prescribed time limit.
          var date = new Date();
          var expiryDate = date.getTime() - self.timeLimit;
          console.log('*********');
          docs.forEach(function(file, index) {
            if (file.dateUploaded < expiryDate) {
              console.log(file.name + ' ' + file.machineFileName + ' file expired.');
              // Delete file.
              fs.unlink(self.tempPath + '/' + file.machineFileName, function(err) {
                if (err) {
                  throw err;
                }
                else {}
                  // Remove record from database.
                  Movie.remove({ _id: file._id }, function(err, result) {
                    if (err) {
                      throw err;
                    }
                    console.log('Movie deleted.');
                  });
              });
            }
            else {
              console.log(file.name + ' ' + file.machineFileName + ' file not expired.');
            }
          });
          self.opCompleted = true;
        });
      
    });
  };
};

exports.MovieFile = MovieFile;
exports.TrashCollector = TrashCollector;
