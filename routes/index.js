/**
 * This file contains route callback functions
 */

// Load required libraries.
var mongoose = require('mongoose');
var fs = require('fs');
var _ = require('underscore');

/*
 * Error page
 */
exports.error = function(req, res) {
  var errorMessage = 'Oops, looks like something went wrong.';
  res.render('error', {
    locals: {
      title: 'Error',
      msg: errorMessage
    }
  });
};


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
    console.log(err);
    if (err) {
      throw err;
      // TODO: rather than throwing error which crashes the program, why not 
      // have a nice little page to tell people something didn't go right. Of 
      // course one would need to consider what kind of information to show, as 
      // it might aid would be hackers. Not something we want.
//      res.render('error', {
//        locals: {
//          title: 'Error',
//          msg: 'Looks like something went wrong. If this problem happens a lot, then you might want to tell your technical person about it.',
//          details: err
//        }
//      });
    }
    else {
      res.render('movie', {
        locals: {
          title: 'Watch Movie',
          movie: doc
        }
      });
    }
  });
}

/**
 * View movies filtered by tag
 */
exports.movieByTag = function(req, res) {
  console.log('*** moviebytag ***');
  console.log(req.params.id);
  var Movie = mongoose.model('Movie');
  var ObjectId = mongoose.Types.ObjectId;
  Movie
    .find({ tags: new ObjectId(req.params.id) })
    .sort('name', -1)
    .exec(function(err, docs) {
      if (err) {
        throw err;
      }
      else {
        console.log(docs);
        res.render('movies', {
          locals: {
            title: 'Movies by Tag',
            movies: docs
          }
        });
      }
    });
};

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
        doc.remove(function(err, result) {
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
          console.log('*** File deleted. ***');
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

/**
 * Display list of tags
 */
exports.showTags = function(req, res) {
  var Tag = mongoose.model('Tag');
  Tag
    .find()
    .sort('title', 1)
    .exec(function(err, docs) {
      if (err) {
        throw err;
      }
      res.render('tags', {
        locals: {
          title: 'tags',
          tags: docs
        }
      });
    });
};