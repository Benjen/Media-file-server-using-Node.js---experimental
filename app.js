
/**
 * Module dependencies.
 */

var async = require('async')
  , exec = require('child_process').exec
  , express = require('express')
//  , io
//  , files = {} // Holds info on files currently being uploaded.
  , fs = require('fs')
  , mime = require('mime-magic')
  , models = require('./models')
  , mongoose = require('mongoose')
//  , MovieFile = require('./movieFile').MovieFile
  , routes = require('./routes')
  , sock // Holds the client-server socket used by socket.io events.
  , Step = require('step')
  , TrashCollector = require('./movieFile').TrashCollector
  , util = require('util')
  , _  = require('underscore');

// temp and file directory locations.
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
  // Time interval between scans for trash in minutes.
  interval: 4,
  // temporary file expiration limit in minutes.
  timeLimit: 1
});

/*
 * Socket.io events
 */
require('./sockets.js')(app, fs, _, util);


/*
 * Import HTTP CRUD methods
 */
require('./crud.js')(app, routes);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
