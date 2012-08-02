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
  var movie = new Movie();
  Movie.find({ permanent: true }, function(err, docs) {
    console.log(docs);
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