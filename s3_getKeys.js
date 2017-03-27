var fs = require('fs');
var path = require('path');
var tagReadingService = require('./model/services/tagReadingService');
var databaseService = require('./model/services/databaseService');
// Load the S3 SDK for JavaScript
// TODO: add only call to S3
// var AWS = require('aws-sdk/clients/s3');
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
// TODO: regen and move to DB and store in private container image
// http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials.html
AWS.config.loadFromPath('./s3_config.json');

//just for local
var proxy = require('proxy-agent');

// AWS.config.update({
//   httpOptions: { agent: proxy('http://172.26.193.2:8080/') }
// });
//end just for local

// Create S3 service object
s3 = new AWS.S3();

var s3MusicService = {};
var bucketUrl = 'robertbutcher.co.uk-music-library';
var params = {
    Bucket: bucketUrl
};

s3MusicService.getTracksInS3 = function() {
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

s3MusicService.identifyTrackChanges = function(trackKeys, index) {
    return new Promise(function(resolve, reject) {
        var newTracks = [];
        var trackKey = trackKeys[index++];

        databaseService.checkTrackExists(trackKey).then(function(exists) {
            if (!exists) {
                newTracks.push(trackKey);
            }

            if (index < trackKeys.length) {
                s3MusicService.identifyTrackChanges(trackKeys, index).then(function(moreTracks) {
                    resolve(newTracks.concat(moreTracks));
                }).catch(function(error) {
                    console.error(error, error.stack);
                });
            }
            else {
                resolve(newTracks);
            }
        }).catch(function(error) {
            console.error(error);
        });
    });
};

s3MusicService.extractTrackMeta = function(trackKeys, index) {
    return new Promise(function(resolve, reject) {
        var trackKey = trackKeys[index++];
        var trackParams = {
            Bucket: bucketUrl,
            Key: trackKey
        };

        var tokenisedKey = trackKey.split(/\//);
        var trackName = tokenisedKey[(tokenisedKey.length - 1)];
        var tokenisedTrackName = trackName.split(/\./);
        var extension = tokenisedTrackName[(tokenisedTrackName.length - 1)];

        if (checkValidExtension(extension)) {
            var cacheTemp = fs.createWriteStream('./media/' + trackName);
            //TODO: add error handling
            s3.getObject(trackParams).
              on('httpData', function(chunk) { cacheTemp.write(chunk); }).
              on('httpDone', function() {
                  cacheTemp.end();
                  tagReadingService.getTags(cacheTemp.path, ['artist', 'album', 'title', 'year']).then(function(tags) {
                      var artist = tags[0];
                      var album  = tags[1];
                      var title  = tags[2];
                      var year  = tags[3];

                      fs.unlink(cacheTemp.path, (error) => {
                          if (error) throw error;
                      });

                      databaseService.checkOrAddArtist(artist).then(function(artistId) {
                          databaseService.checkOrAddAlbum(artistId, album).then(function(albumId) {
                              databaseService.addTrack(albumId, artistId, extension, trackKey, title, year);
                          }).catch(function(error) {
                              console.error(error);
                          });
                      }).catch(function(error) {
                          console.error(error);
                      });
                  });

                  //forces synchronous processing of files to prevent mem issues
                  if (index < trackKeys.length) {
                      s3MusicService.extractTrackMeta(trackKeys, index);
                  }
              }).
              send();
        }
        else {
            //forces synchronous processing of files to prevent mem issues
            if (index < trackKeys.length) {
                s3MusicService.extractTrackMeta(trackKeys, index);
            }
        }
    });
};

function checkValidExtension(extension) {
    var valid = false;
    if (extension == 'mp3' || extension == 'm4a') {
        valid = !valid;
    }

    return valid;
}

module.exports = s3MusicService;

console.log("Checking S3 for new tracks..");
s3MusicService.getTracksInS3().then(function(trackKeys) {
//TODO: pull each track if mp3 / m4a and extract tags
// initially this will be slow but once db model is built it
// should just be a case of maintenance

    s3MusicService.identifyTrackChanges(trackKeys, 0).then(function(newTracks) {
        console.log('Total of [' + newTracks.length + '] new tracks found');
        s3MusicService.extractTrackMeta(newTracks, 0);
    });
}).catch(function(error) {
    console.error(error, error.stack);
});
