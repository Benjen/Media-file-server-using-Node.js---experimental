/* 
 * Route Controllers
 * 
 * See "./routes/index.js" for callback functions attached to these controllers.
 */

module.exports = function(app, routes) {

  app.get('/', routes.index);

  app.get('/upload', routes.upload);

  app.get('/movie/tag/:tagId', routes.movieByTag);
  
  app.get('/movie/tag/:tagId/movie/:movieId/delete', routes.confirmDeleteMovie);
  
  app.get('/movie/tag/:tagId/movie/:movieId', routes.movie);

  app.get('/movie/:movieId/delete', routes.confirmDeleteMovie);

  app.get('/movie/:movieId', routes.movie);
  
  app.post('/movie/delete', routes.postDeleteMovie);
  
  app.get('/tags', routes.showTags);
  
  /*
   * Error pages
   */
//  app.get('/error/:errnum', routes.error);
};


