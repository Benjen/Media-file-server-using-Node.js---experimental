/**
 * This file contains route callback functions
 */

// Load required libraries.
var mongoose = require('mongoose');
var fs = require('fs');

/*
 * Movie upload page
 */
exports.upload = function(req, res) {
  res.render('upload', {
    locals: {
      title: 'Upload Movie'
    },
    status: 200
  });
};

/**
 * Home page
 */
exports.index = function(req, res) {
  // Get movies in database.
  var Movie = mongoose.model('Movie');
  Movie.find({ permanent: true }, function(err, docs) {
    // Render content.
    res.render('index', {
      locals: {
        title: 'Media Server',
        movies: docs
      },
      status: 200
    });
  });
};

/**
 * Confirm movie delete
 */
exports.confirmDeleteMovie = function(req, res) {
  var movieId = req.params.id;
  var Movie = mongoose.model('Movie');
  Movie.findOne({ _id: movieId }, function(err, doc) {
    if (err) {
      throw err;
    }
    else {
      res.render('confirmDelete', {
        locals: {
          title: 'Delete ' + doc.name,
          _id: movieId,
          movietitle: doc.name
        }
      });
    }
  });
};

/**
 * View individual movie.
 */
exports.movie = function(req, res) {
  var Movie = mongoose.model('Movie');
  Movie.findById(req.params.id, function(err, doc) {
    if (err) {
      res.send('An error occured.', 500);
    }
//    else if (doc === null) {
//      res.send('No record found.', 505);
//    }
    else {
      console.log(doc);
      console.log(req.params);
      res.render('movie', {
        locals: {
          title: 'Watch Movie',
          movie: {
            title: doc.name,
            file: doc.machineFileName,
            tags: doc.tags.join(', ')
          }
        }
      });
    }
  });
}

/**
 * Delete a movie
 */
exports.postDeleteMovie = function(req, res) {
  // Get path the files directory.
  var filesDir = req.app.settings.FILESDIR;

  if (req.body.submit === 'Delete') {
    var Movie = mongoose.model('Movie');
    // Get movie record.
    Movie.findOne({ _id: req.body.movieId }, function(err, doc) {
      if (err) {
        throw err;
      }
      else {
        // Get name of file on server.
        var fileName = doc.machineFileName;
        var filePath = filesDir + '/' + fileName;
        var thumbnailPath = filesDir + '/' + fileName + '_thumb.jpg';
        // Delete movie from database.
        Movie.remove({ _id: doc._id }, function(err, result) {
          if (err) {
            throw err;
          }
          // Delete files from server.
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
          // Redirect to front page.
          res.redirect('/', 302);
        });
      }
    });
  }
  else {
    // Redirect to front page.
    res.redirect('/', 302);
  }
};