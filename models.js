/**
 * Mongo database models
 */

function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;

  /**
   * Model - User
   */
  User = new Schema({
    'uid': Number,
    'name': String
  }, { strict: true });
  
  mongoose.model('User', User);
  
  /**
   * Model - Movie
   */
  Movie = new Schema({
    'mid': String,
    'name': String,
    'type': String,
    'dataUploaded': Date,
    'viewed': Number,
    'uid': Number,
    'flags': [],
    'tags': []
  }, { strict: true });
  
  mongoose.model('Movie', Movie);
 
  fn();
}

exports.defineModels = defineModels; 