var fs = require('fs');
var path = require('path');
var tagReadingService = require('./model/services/tagReadingService');
// Load the S3 SDK for JavaScript
// TODO: add only call to S3
// var AWS = require('aws-sdk/clients/s3');
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
// TODO: regen and move to DB and store in private container image
// http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials.html
AWS.config.loadFromPath('./s3_config.json');

// Create S3 service object
s3 = new AWS.S3();

var s3MusicService = {};
var params = {
    Bucket: 'robertbutcher.co.uk-music-library'
};

s3MusicService.getAllS3Tracks = function() {
    return new Promise(function(resolve, reject) {
        var allKeys = [];
        s3.listObjectsV2(params, function (error, data) {
            if (error) {
                reject(error);
            } else {
                var contents = data.Contents;
                contents.forEach(function (content) {
                    console.log(content)
                    allKeys.push(content.Key);
                });

                if (data.IsTruncated) {
                    params.ContinuationToken = data.NextContinuationToken;
                    s3MusicService.getAllS3Tracks().then(function(moreKeys) {
                        resolve(allKeys.concat(moreKeys));
                    }).catch(function(error) {
                        console.error(error, error.stack);
                    });
                }
                else {
                  resolve(allKeys);
                }
            }
        });
    });
};

module.exports = s3MusicService;

console.log("Getting all tracks..");
s3MusicService.getAllS3Tracks().then(function(tracks) {
    console.log(tracks);

    params.Key = tracks[20];
    var file = fs.createWriteStream('cache.mp3');
    s3.getObject(params).
      on('httpData', function(chunk) { file.write(chunk); }).
      on('httpDone', function() {
          file.end();
          console.log(file.path)
          tagReadingService.getTags(file.path, ['artist', 'album']).then(function(tags) {
              console.log(tags[0]);
              console.log(tags[1]);
          });
      }).
      send();
    tracks.forEach(function(track) {

    });
}).catch(function(error) {
    console.error(error, error.stack);
});
