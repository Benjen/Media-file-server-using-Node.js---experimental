/**
 * This file contains route callback functions
 */

// Load required libraries.
var mongoose = require('mongoose');
var fs = require('fs');
var _ = require('underscore');
var url = require('url');
var media = require('../media.js');

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
  var currentUri = '';

  Movie.find({ permanent: true }, function(err, docs) {
    // Render content.
    res.render('movies', {
      locals: {
        title: 'Welcome to Media Server',
        movies: docs,
        currentUri: currentUri
      },
      status: 200
    });
  });
};

/**
 * Confirm movie delete
 */
exports.confirmDeleteMovie = function(req, res) {
  var movieId = req.params.movieId;
  // Get url of previous page.
  var currentUri = decodeURI(req.query.prev);
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
          movietitle: doc.name,
          currentUri: currentUri
        },
        status: 200
      });
    }
  });
};

/**
 * View individual movie.
 */
exports.movie = function(req, res) {
  var Movie = mongoose.model('Movie');
  var currentUri = encodeURI(url.parse(req.url).path);
  
  Movie.findById(req.params.movieId)
    .populate('tags')
    .exec(function(err, doc) {
      if (err) {
        throw err;
        // TODO: rather than throwing error which crashes the program, why not 
        // have a nice little page to tell people something didn't go right. Of 
        // course one would need to consider what kind of information to show, as 
        // it might aid would be hackers. Not something we want.
        /*
        res.render('error', {
          locals: {
            title: 'Error',
            msg: 'Looks like something went wrong. If this problem happens a lot, then you might want to tell your technical person about it.',
            details: err
          }
        });
        */
      }
      else {
        res.render('movie', {
          locals: {
            title: 'Watch Movie',
            movie: doc,
            currentUri: currentUri
          },
          status: 200
        });
      }
    });
}

/**
 * View movies filtered by tag
 */
exports.movieByTag = function(req, res) {
  var Movie = mongoose.model('Movie');
  var ObjectId = mongoose.Types.ObjectId;
  var currentUri = encodeURI(url.parse(req.url).path);
  var tagId = req.params.tagId;
  var tag;
  
  Movie
    .find({ tags: new ObjectId(tagId) })
    .populate('tags')
    .sort('name', -1)
    .exec(function(err, docs) {
      if (err) {
        throw err;
      }
      else {
        // Get tag name. Since all documents in the array docs contain the tag 
        // in question, one can just extract the tag name from the first one.
        tag = _.find(docs[0].tags, function(item) {
          console.log(typeof item);
          console.log(typeof tagId);
          if (item._id.toString() === tagId) {
            return true;
          }
        });

        // Render view.
        res.render('movies', {
          locals: {
            title: 'Movies by \'' + tag.title + '\'',
            movies: docs,
            currentUri: currentUri
          }
        });
      }
    });
};

/**
 * Delete a movie
 */
exports.postDeleteMovie = function(req, res) {
  console.log('postdeletemovie');
  // Get path the files directory.
  var filesDir = req.app.settings.FILESDIR;
  // Get URI of previous page.
  var prev = req.body.prevPage;
  console.log(prev);

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
          // Redirect to previous page.
          
          // If previous page URI is either '/movie/tag/:tagId/movie/:movieId', 
          // '/movie/:movieId' or '/movie/tag/:tadId', then the page no longer 
          // exists after deleting the movie. In this case we mush redirect to 
          // one page up in the heirarchy.
          var regexPattern1 = /^\/movie\/tag\/[a-z0-9]{24}\/movie\/[a-z0-9]{24}$/i;
          var regexPattern2 = /^\/movie\/[a-z0-9]{24}$/i;
          var regexPattern3 = /^\/movie\/tag\/[a-z0-9]{24}$/i;
          if (regexPattern1.test(prev) || regexPattern2.test(prev) || regexPattern3.test(prev)) {
            // If this next page up in the heirarchy is filtered by tag, then 
            // must confirm if the tag still exists now that the current 
            // document has been removed.
            if (regexPattern1.test(prev) || regexPattern3.test(prev)) {
              if (doc.tagRemoved) {
                // Tag no longer in system so return to home page.
                res.redirect('/', 302);
                return;
              }
            }
            // Modify URI to point to next page up in heirarchy.
            var params = prev.split('/');
            params = params.slice(0, params.length - 2);
            prev = params.join('/');
          }
          res.redirect(prev, 302);
        });
      }
    });
  }
  else {
    // Redirect to previous page.
    res.redirect(prev, 302);
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