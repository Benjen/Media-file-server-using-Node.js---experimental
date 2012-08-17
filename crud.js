/* 
 * Route Controllers
 * 
 * See "./routes/index.js" for callback functions attached to these controllers.
 */

module.exports = function(app, routes) {

  app.get('/', routes.index);

  app.get('/upload', routes.upload);

  app.get('/movie/:id', routes.movie);
  
  app.get('/movie/tag/:id', routes.movieByTag);

  app.get('/movie/:id/delete', routes.confirmDeleteMovie);

  app.post('/movie/delete', routes.postDeleteMovie);
  
  app.get('/tags', routes.showTags);
  
  /*
   * Error pages
   */
//  app.get('/error/:errnum', routes.error);
};


