/**
 * Mongo database models
 */

function defineModels(mongoose, async, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;

  /**
   * Model - User
   */
  User = new Schema({
    // TODO: probably better off using a virtual for uid, since it is the same 
    // as _id.
    'uid': ObjectId,
    'name': String
  }, { strict: true });
  
  mongoose.model('User', User);
  
  /**
   * Model - Movie
   */
  Movie = new Schema({
    'name': String,
    'machineFileName': String,
    'originalFileName': String,
    'size': Number,
    'type': String,
    'permanent': { type: Boolean, default: false },
    'dateUploaded': Date,
    'amountUploaded': { type: Number, default: 0 },
    'viewed': Number,
    'uid': String,
    'flags': [],
    'tags': [ObjectId]
  }, { strict: true });
  
//  Movie.pre('save', function(next) {
//    console.log('*** Pre save ***');
//    next();
//  });
  
  Movie.pre('remove', function(next) {
    console.log('*** Pre remove ***');
    var self = this;
    async.forEach(
      this.tags,
      function(id, done) {
        console.log(id);
        mongoose.models['Movie'].find({ tags: id }, function(err, docs) {
          if (docs.length === 1 && self._id.equals(docs[0]._id)) {
            // Remove tag.
            mongoose.models['Tag'].remove({ _id: id }, function(err, result) {
              if (err) {
                done(err);
              }
              else {
                console.log('Tag removed.');
                done(null);
              }
            });
          }
          else {
            console.log('No tags to remove.');
            done(null);
          }
        });  
      },
      function(err) {
        next(err);
      }
    );
  });
  
  mongoose.model('Movie', Movie);
 
  /**
   * Model - Tag
   */
  Tag = new Schema({
    'title': { type: String, unique: true, sparse: true }
  }, { strict: true });
  
  mongoose.model('Tag', Tag);
  
  fn();
}

exports.defineModels = defineModels; 