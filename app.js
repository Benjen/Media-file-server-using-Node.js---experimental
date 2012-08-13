
/**
 * Module dependencies.
 */

var async = require('async')
  , exec = require('child_process').exec
  , express = require('express')
  , io
  , files = {} // Holds info on files currently being uploaded.
  , fs = require('fs')
  , mime = require('mime-magic')
  , models = require('./models')
  , mongoose = require('mongoose')
  , MovieFile = require('./movieFile').MovieFile
  , routes = require('./routes')
  , sock // Holds the client-server socket used by socket.io events.
  , Step = require('step')
  , TrashCollector = require('./movieFile').TrashCollector
  , util = require('util')
  , _ = require('underscore');

const TEMPDIR = './temp';
const FILESDIR = './static/files';

var app = module.exports = express.createServer();

/*
 * Configuration
 */

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('FILESDIR', FILESDIR);
  app.set('TEMPDIR', TEMPDIR);
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
  app.Tag = Tag = mongoose.model('Tag');
  db = mongoose.connect(app.set('db-uri'));
});


/*
 * Initialize movie file trash collector
 */
var trashCollector = new TrashCollector();
trashCollector.init({
  tempPath: TEMPDIR,
  interval: 4,
  // temporary file expiration limit in minutes.
  timeLimit: 1
});

/*
 * Socket.io events
 */

// Initialize socket.io.
io = require('socket.io').listen(app);

// Processes file after upload has completed.
function uploadCompleted(machineName) {
  fs.write(files[machineName].getHandler(), files[machineName].getData(), null, 'binary', function(err, written) {
//    
//    Problem using mime-magic with Arch Linux. temp disable until can get work around.
//    
//    mime.fileWrapper(TEMPDIR + '/' + machineName, function(err, type) {
//      if (err) {
//        throw err;
//      }
//      // Validate file to confirm it is a video file.
//      var regex = /video.*/;
//      if (type.search(regex) === -1) {
//        sock.emit('cancelUpload', { message: 'Upload failed.  The uploaded file is not a valid movie file.' });
//        // Remove record from database.
//        files[machineName].remove(function(err) {
//          if (err) {
//            throw err;
//          }
//          // Delete file.
//          delete files[machineName];
//        });
//        // Exit this function.
//        return;
//      }

      // Record file in database.
      files[machineName].exists(function(error, exists, doc) {
        if (error) {
          console.log(error);
        }
        else if (exists === false) {
          // Is a new file, so save it to database.
          files[machineName].save(function(err, data) {
            if (error) {
              throw error;
            }
          });
        }
        else if (exists === true) {
          // Update existing database record.
          files[machineName].setId(doc._id);
          files[machineName].update(function(error, success) {
            if (error) {
              throw error;
            }
          });
        }
      });
      var input = fs.createReadStream(TEMPDIR + '/' + machineName);
      var output = fs.createWriteStream(FILESDIR + '/' + machineName);
      util.pump(input, output, function(error) {
        // Delete temp media file.
        fs.unlink("temp/" + machineName, function (error) {
          // Mark file in database as permanent.
          files[machineName].setPermanent(true);
          files[machineName].update(function(error, success) {
            if (error) {
              throw error;
            }
          });
          // Create thumbnail images.
          var options = {
            path: FILESDIR,
            dimensions: '200x?'
          };
          files[machineName].createThumbnail(options, function(error, thumbName) {
            if (error) {
              throw error;
            }
            else {
             // Move file completed.  Can now generate thumbnail.
              sock.emit('done', {'image' : 'files/' + thumbName});
              // Upload fully complete. Destroy MovieFile object for this file.
              delete files[machineName];
            }
          });

        });
      });
    });
//    
//    Problem using mime-magic with Arch Linux. temp disable until can get work around.
// 
//  });
}

// Set on connection event.
io.sockets.on('connection', function (socket) {
  // Assign socket to app wide variable.
  sock = socket;
  // Start uploading process
  //   @param data contains the variables passed through from the html file.
  socket.on('start', function (data) {
    var name = data.name;
    var size = data.fileSize;
    var filename = data.filename;
    var date = new Date();
    var tags = data.tags.split(' ');
    // Create instance of MovieFile object.
    var movieFile = new MovieFile({
      filesDir: FILESDIR,
      tempDir: TEMPDIR
    });
    movieFile.setName(name);
    movieFile.setOriginalFileName(filename);
    movieFile.setFileSize(size);
    movieFile.setData('');
    movieFile.setAmountUploaded(0);
    movieFile.setDateUploaded(date.getTime());
    // Set tags.
//    tag.forEach(function(item, index) {
//      // Check if tag already exists in database.
//      Tag.findOne({ title: item }, function(err, doc) {
//        if (err) {
//          throw err;
//        }
//        else {
//          console.log(doc);
//        }
//      });
//      // Save tag to database and retrieve new tag _id.
//    });
    // Get the machine name for the file.
    movieFile.exists(function(err, exists, record) {
      if (exists === true && record !== 'undefined') {
        // Check if a completed uploaded copy is already on the server as
        // we don't want a duplicate copy.
        if (record.permanent === true) {
          socket.emit('cancelUpload', {
            message: 'A copy of this file has already been uploaded.  Please delete the uploaded copy before proceeding.' ,
            movieId: record._id
          });
          // Exit function.
          return;
        }

        // Is an existing file so get its machine name.
        movieFile.setMachineFileName(record.machineFileName);
        movieFile.setId(record._id);
        movieFile.update(function(err, data) {
          if (err) {
            throw err;
          }
        });
      }
      else {
        // Is a new file so give it a machine name.
        movieFile.createNewMachineFileName();
        movieFile.save(function(err, data) {
          if (err) {
            throw error;
          }
          movieFile.setId(data._id);
        });
      }
      //Create a new Entry in The Files Variable.
      var machineName = movieFile.getMachineFileName();
      files[machineName] = movieFile;

      // Create variable to hold value of upload starting place.
      var place = 0;
      try {
        // Is the file already present on server.
        var stat = fs.statSync('temp/' +  machineName);
        if (stat.isFile()) {
          // Update file information with size of already uploaded portion of file.
          files[machineName].setAmountUploaded(stat.size);
          // Set starting place for continuation of uploading.
          place = stat.size / 524288;
        }
      }
      catch (error) {
        // No file present? Must be a new upload.
        console.info('No file present, must be new file.');
      }
      fs.open("temp/" + machineName, "a", 0755, function(error, fd) {
        if (error) {
           console.log(error);
        }
        else {
          // Store file handler so can be written to later.
          files[machineName].setHandler(fd);
          // Fetch file data from client.
          socket.emit('moreData', {
            'place': place,
            percent: 0
          });
        }
      });
    });
  });

  socket.on('upload', function (data) {
    // Get machine name of file.
    var machineName;
    var file = _.find(files, function(file) {
      if (file.originalFileName === data.filename && file.fileSize === data.fileSize) {
        return true;
      }
    });
    machineName = file.machineFileName;

    files[machineName].setAmountUploaded(files[machineName].getAmountUploaded() + data['data'].length);
    // Add data to data buffer.
    files[machineName].setData(files[machineName].getData() + data['data']);
    // Set time of upload occurence.
    var date = new Date();
    files[machineName].setDateUploaded(date.getTime());

    if (files[machineName].getAmountUploaded() == files[machineName].getFileSize())  {
      // File is fully uploaded.
      uploadCompleted(machineName, socket);
    }
    else if (files[machineName].getData().length > 10485760) {
      // Data Buffer is full (has reached 10MB) proceed to write buffer to file on server.
      fs.write(files[machineName].getHandler(), files[machineName].getData(), null, 'binary', function(err, written) {
        // Record file in database.
        files[machineName].exists(function(err, exists, doc) {
          if (err) {
            throw error;
          }
          else if (exists === false) {
            // Is a new file, so save it to database.
            files[machineName].save(function(err, data) {
              if (err) {
                throw err;
              }
            });
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

app.get('/upload', routes.upload);

app.get('/movie/:id', routes.movie);

app.get('/movie/delete/:id', routes.confirmDeleteMovie);

app.post('/movie/delete', routes.postDeleteMovie);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
