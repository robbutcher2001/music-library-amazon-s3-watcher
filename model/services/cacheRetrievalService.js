var fs = require('fs');
var mongoose = require('mongoose');
var grid = require('gridfs-stream');
var TrackCache = require('../schemas/trackCache');

// Connect to mongodb track cache database
mongoose.connect('mongodb://database-service-container/music-track-cache-db');
grid.mongo = mongoose.mongo;
var conn = mongoose.connection;

var gfs = grid(conn.db);

// streaming to gridfs
//filename to store in mongodb
var writestream = gfs.createWriteStream({
    filename: 'somethingAgain.mp3'
});
fs.createReadStream('./media/something.mp3').pipe(writestream);

writestream.on('close', function (file) {
    // do something with `file`
    console.log(file.filename + 'Written To DB');
});

var track = fs.readFileSync('./media/something.mp3');

// var newCache = new TrackCache({
//     trackId: 'something.mp3',
//     data: track
// });
//
// newCache.save(function (err, trackCacheCallback) {
//     if (err == null) {
//         trackCacheCallbackId = trackCacheCallback.id;
//         console.log(trackCacheCallbackId);
//         // console.log('New artist [' + artist + '] added to DB with new ID [' + artistId + ']');
//     }
//     else {
//         console.error('Could not persist [' + 'thing' + '] to DB: ' + err);
//     }
// });

var cacheRetrievalService = {};

cacheRetrievalService.getTracksInS3 = function() {
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

module.exports = cacheRetrievalService;
