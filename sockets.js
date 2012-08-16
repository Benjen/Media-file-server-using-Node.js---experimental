/* 
 * Module to handle socket.io components of the app
 * 
 * Requires the following modules must be passed by the app calling this module:
 *   app - the node app itself
 *   fs - node file system module
 *   _ - underscore
 *   util - node utilities module 
 *   mime - mime-magic module
 *   async - async module
 */

module.exports = function(app, fs, _, util, mime, async) {
  // Initialize socket.io.
  var io = require('socket.io').listen(app);
  // Holds the client-server socket used by socket.io events.
  var sock;
  // Holds info on files currently being uploaded via socket.io.
  var files = {};
  // Helper class to manage extracted movie file data.
  var MovieFile = require('./movieFile').MovieFile;
  var tempdir = app.settings.TEMPDIR;
  var filesdir = app.settings.FILESDIR;

  // Processes file after upload has completed.
  function uploadCompleted(machineName) {
    fs.write(files[machineName].getHandler(), files[machineName].getData(), null, 'binary', function(err, written) {
      mime.fileWrapper(tempdir + '/' + machineName, function(err, type) {
        if (err) {
          throw err;
        }
        // Validate file to confirm it is a video file.
        var regex = /video.*/;
        if (type.search(regex) === -1) {
          sock.emit('cancelUpload', { message: 'Upload failed.  The uploaded file is not a valid movie file.' });
          // Remove record from database.
          files[machineName].remove(function(err) {
            if (err) {
              throw err;
            }
            // Delete file.
            delete files[machineName];
          });
          // Exit this function.
          return;
        }

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
        var input = fs.createReadStream(tempdir + '/' + machineName);
        var output = fs.createWriteStream(filesdir + '/' + machineName);
        util.pump(input, output, function(error) {
          // Delete temp media file.
          fs.unlink(tempdir + '/' + machineName, function (error) {
            // Mark file in database as permanent.
            files[machineName].setPermanent(true);
            files[machineName].update(function(error, success) {
              if (error) {
                throw error;
              }
            });
            // Create thumbnail images.
            var options = {
              path: filesdir,
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
    });
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
      var tags = data.tags.split(',');
      // Create variable to hold value of upload starting place.
      var place;
      // Create instance of MovieFile object.
      var movieFile = new MovieFile({
        filesDir: filesdir,
        tempDir: tempdir,
        app: app
      });
      
      async.series({
        // Set movieFile properties.
        setMovieFileProperties: function(next) {
          movieFile.setName(name);
          movieFile.setOriginalFileName(filename);
          movieFile.setFileSize(size);
          movieFile.setData('');
          movieFile.setAmountUploaded(0);
          movieFile.setDateUploaded(date.getTime());
          next(null);
        },
        // Process tags. 
        setTags: function(next) {
          // Add tag values to movieFile object.
          async.forEach(
            tags, 
            // Function to apply to each item.
            function(item, done) {
              movieFile.addTag(item, function(err) {
                if (err) {
                  done(err);
                }
                done(null);
              })
            }, 
            // Function to apply after completion.
            function(err) {
              // Done
              next(err);
            }
          );
        },
        // Set the machine name of the file.
        setMachineFileName: function(next) {
          movieFile.exists(function(err, exists, record) {
            if (exists === true && record !== 'undefined') {
              // Check if a completed uploaded copy is already on the server as
              // we don't want a duplicate copy.
              if (record.permanent === true) {
                socket.emit('cancelUpload', {
                  message: 'A copy of this file has already been uploaded.  Please delete the uploaded copy before proceeding.' ,
                  movieId: record._id
                });
//                var error = new Error('A copy of this file already exists.');
                next(new Error('A copy of this file already exists.'));
                // Exit function.
                return;
              }

              // Is an existing file so get its machine name.
              movieFile.setMachineFileName(record.machineFileName);
              movieFile.setId(record._id);
              movieFile.update(function(err, data) {
                if (err) {
                  next(err);
                }
                next(null);
              });
            }
            else {
              // Is a new file so give it a machine name.
              movieFile.createNewMachineFileName();
              movieFile.save(function(err, data) {
                if (err) {
                  next(err);
                }
                movieFile.setId(data._id);
                next(null);
              });
            }
          });
        },
        addToFilesArray: function(next) {
          //Create a new Entry in The Files Variable.
          var machineName = movieFile.getMachineFileName();
          files[machineName] = movieFile;
          next(null);
        },
        setUploadStats: function(next) {
          var machineName = movieFile.getMachineFileName();
          // Create variable to hold value of upload starting place.
          place = 0;
          try {
            // Is the file already present on server.
            var stat = fs.statSync(tempdir + '/' +  machineName);
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
          next(null);
        },
        setFileHandler: function(next) {
          var machineName = movieFile.getMachineFileName();
          fs.open('temp' + '/' + machineName, "a", 0755, function(error, fd) {
            if (error) {
               next(err)
            }
            else {
              // Store file handler so can be written to later.
              files[machineName].setHandler(fd);
              // Fetch file data from client.
              socket.emit('moreData', {
                'place': place,
                percent: 0
              });
              next(null);
            }
          });
        }
      },
      function(err, results) {
        // Async series block completed.
        if (err) {
//          throw err;
        }
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
};

