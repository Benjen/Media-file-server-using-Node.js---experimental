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

  /**
   * Getter function
   * 
   * Gets tag text as well as tag ObjectId.
   */
  function getTagNames(tags) {
//    var newArray = new Array();
//    async.forEach(
//      tags,
//      function(id, done) {
//        mongoose.models['Tag'].findOne({ _id: id }, function(err, doc) {
//          if (err) {
//            done(err);
//          }
//          else if (doc) {
//            newArray.push(doc);
//            done(null);
//          }
//          else {
//            console.log(doc);
//            // Just incase something weird like no document is found.  
//            // Technically this condition should not occur in reality. But we 
//            // put something here to catch it just in case.
//            done(new Error('No tag document found.'));
//          }
//        });
//      },
//      function(err) {
//        if (err) {
//          throw err;
//        }
//        console.log(newArray);
//        return newArray;
//      }
//    );
    return tags;
  }

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
    'tags': {
      type: Array, 
      get: getTagNames
    }
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