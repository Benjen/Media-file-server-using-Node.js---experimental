/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

var fs = require('fs');
var mime = require('mime-magic');

mime.fileWrapper('temp/1344847170457', function(err, type) {
    if (err) {
      throw err;
    }
    else {
        console.log('File found.');
    }
});