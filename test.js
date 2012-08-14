/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

var fs = require('fs');
var mime = require('mime-magic');
var async = require('async');

function pre() {
  console.log('Pre');
}

function post() {
  console.log('Post');
}

pre();
async.series([
  function(callback){
      // do some stuff ...
      setTimeout(function() {
        callback(null, 1)
      }, 4000);
  },
  function(callback){
      // do some more stuff ...
      
      callback(null, 2);
  },
],
// optional callback
function(err, results){
    // results is now equal to ['one', 'two']
    console.log(results);
});
post();
