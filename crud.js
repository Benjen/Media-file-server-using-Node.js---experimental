/* 
 * Route Controllers
 * 
 * See "./routes/index.js" for route callback functions.
 */

module.exports = function(app, routes) {
  app.get('/', routes.index);

  app.get('/upload', routes.upload);

  app.get('/movie/:id', routes.movie);

  app.get('/movie/delete/:id', routes.confirmDeleteMovie);

  app.post('/movie/delete', routes.postDeleteMovie);
};


