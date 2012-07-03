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
    'uid': ObjectId,
    'name': String
  }, { strict: true });
  
  mongoose.model('User', User);
  
  /**
   * Model - Movie
   */
  Movie = new Schema({
    'mid': ObjectId,
    'name': String,
    'machineFileName': String,
    'originalFileName': String,
    'size': Number,
    'type': String,
    'dataUploaded': Date,
    'amountUploaded': { type: Number, default: 0 },
    'viewed': Number,
    'uid': String,
    'flags': [],
    'tags': []
  }, { strict: true });
  
  mongoose.model('Movie', Movie);
 
  fn();
}

exports.defineModels = defineModels; 