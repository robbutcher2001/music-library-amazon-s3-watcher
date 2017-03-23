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

s3MusicService.getTrack = function(trackKey) {
    return new Promise(function(resolve, reject) {
      //TODO: move bucket URL out
      var trackParams = {
          Bucket: 'robertbutcher.co.uk-music-library',
          Key: trackKey
      };

      var tokenisedKey = trackKey.split(/\//);
      var trackName = tokenisedKey[(tokenisedKey.length - 1)];
      var cacheTemp = fs.createWriteStream(trackName);
      //TODO: add error handling
      s3.getObject(trackParams).
        on('httpData', function(chunk) { cacheTemp.write(chunk); }).
        on('httpDone', function() {
            cacheTemp.end();
            resolve(cacheTemp);
        }).
        send();
    });
};

module.exports = s3MusicService;

console.log("Getting all tracks..");
s3MusicService.getAllS3Tracks().then(function(trackKeys) {
//TODO: pull each track if mp3 / m4a and extract tags
// initially this will be slow but once db model is built it
// should just be a case of maintenance


    trackKeys.forEach(function(trackKey) {
        s3MusicService.getTrack(trackKey).then(function(track) {
            console.log(track.path + " processed")

            // tagReadingService.getTags(track.path, ['artist', 'album']).then(function(tags) {
            //     console.log(tags[0]);
            //     console.log(tags[1]);
            // });
        }).catch(function(error) {
            console.error(error, error.stack);
        });
    });
}).catch(function(error) {
    console.error(error, error.stack);
});
