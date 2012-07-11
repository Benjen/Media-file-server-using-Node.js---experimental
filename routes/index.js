/**
 * This file contains route callback functions
 */

/*
 * GET home page.
 */
exports.upload = function(req, res) {
  res.render('upload', {
    locals: {
      title: 'Upload Movie'
    },
    status: 200
  });
};

exports.index = function(req, res) {
  res.render('index', { 
    locals: {
      title: 'Media Server' 
    },
    status: 200
  });
};