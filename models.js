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
    'name': String,
    'password': String
  }, { strict: true });
  
  mongoose.model('User', User);
  
  /**
   * Model - Movie
   */

  /**
   * Define schema
   */
  Movie = new Schema({
    'name': String,
    'machineFileName': String,
    'originalFileName': String,
    'size': Number,
    'type': String,
    'permanent': { 
      type: Boolean, 
      default: false 
    },
    'dateUploaded': Date,
    'amountUploaded': {
      type: [], 
      default: 0 
    },
    'viewed': Number,
    'uid': String,
    'flags': [],
    'tags': [{
      type: ObjectId, 
      ref: 'Tag'
    }]
//    'tags': [ObjectId]
  }, { strict: true });
  
  /**
   * Delete associated tags if they are not attached to any other movies prior 
   * to deleting the current movie
   * 
   * Prevents orphaned tags appearing in the system.
   */
  Movie.pre('remove', function(next) {
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
                // Create a variable which can be used later to check if the tag
                //  was removed.
                self.tagRemoved = true;
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