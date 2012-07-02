/**
 * This file contains route callback functions
 */

/*
 * GET home page.
 */
exports.index = function(req, res) {
  res.render('index', { 
    locals: {
      title: 'Media Server' 
    },
    status: 200
  });
};