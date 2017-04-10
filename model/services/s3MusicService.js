var fs = require('fs');
var tagReadingService = require('./tagReadingService');
var databaseService = require('./databaseService');
var cacheManagementService = require('./cacheManagementService');
// Load the S3 SDK for JavaScript
// TODO: add only call to S3
// var AWS = require('aws-sdk/clients/s3');
var AWS = require('aws-sdk');

//just for local
// var proxy = require('proxy-agent');
//
// AWS.config.update({
//   httpOptions: { agent: proxy('http://172.26.193.2:8080/') }
// });
//end just for local

// Create S3 service object
var s3 = new AWS.S3({signatureVersion: 'v4'});

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

s3MusicService.updateDatabaseModel = function(trackKeys, index, callback) {
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
                  var album = tags[1];
                  var title = tags[2];
                  var year = tags[3];

                  databaseService.checkOrAddArtist(artist).then(function(artistId) {
                      databaseService.checkOrAddAlbum(artistId, album).then(function(albumId) {
                          databaseService.addTrack(albumId, artistId, extension, trackKey, title, year).then(function(trackId) {
                              cacheManagementService.checkCache(trackId).then(function(retrievedTrack) {
                                  if (retrievedTrack == false) {
                                      cacheManagementService.putCache(cacheTemp.path, trackId).then(function(cached) {
                                          if (cached == true) {
                                              console.log('Track [' + trackId + '] cached in DB');
                                          }

                                          fs.unlink(cacheTemp.path, (error) => {
                                              if (error) throw error;
                                          });

                                          //do not callback here as we need
                                          //to wait until recursion is complete
                                      }).catch(function(error) {
                                          console.error(error);
                                      });
                                  }
                                  else {
                                      console.log('Track [' + trackId + '] found in cache DB, ignoring');
                                  }
                              }).catch(function(error) {
                                  console.error(error);
                              });
                          }).catch(function(error) {
                              console.error(error);
                          });
                      }).catch(function(error) {
                          console.error(error);
                      });
                  }).catch(function(error) {
                      console.error(error);
                  });
              });

              //forces synchronous processing of files to prevent mem issues
              if (index < trackKeys.length) {
                  s3MusicService.updateDatabaseModel(trackKeys, index, function() {
                      callback();
                  });
              }
              else {
                  callback();
              }
          }).
          send();
    }
    else {
        //forces synchronous processing of files to prevent mem issues
        if (index < trackKeys.length) {
            s3MusicService.updateDatabaseModel(trackKeys, index, function() {
                callback();
            });
        }
        else {
            callback();
        }
    }
};

function checkValidExtension(extension) {
    var valid = false;
    if (extension == 'mp3' || extension == 'm4a') {
        valid = !valid;
    }

    return valid;
}

module.exports = s3MusicService;
