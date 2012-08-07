/**
 * This file contains route callback functions
 */

/*
 * GET home page.
 */
var mongoose = require('mongoose');

exports.upload = function(req, res) {
  res.render('upload', {
    locals: {
      title: 'Upload Movie'
    },
    status: 200
  });
};

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
      res.render('movie', {
        locals: {
          title: 'Watch Movie',
          movie: {
            title: doc.name,
            file: req.params.movieFileName
          }
        }
      });
    }
  });
}