// Impl from: http://mongodb.github.io/node-mongodb-native/2.2/tutorials/gridfs/streaming/
var fs = require('fs');
var mongodb = require('mongodb');

const dburi = 'mongodb://database-service-container/music-track-cache-db';

var cacheBuilderService = {};

cacheBuilderService.checkCache = function(trackId) {
    return new Promise(function(resolve, reject) {
        mongodb.MongoClient.connect(dburi, function(error, db) {
            var collection = db.collection('fs.files');

            collection.find({'filename': trackId}).count(function(err, count) {
                if (count > 0) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            });
        });
    });
};

cacheBuilderService.putCache = function(filePath, trackId) {
    return new Promise(function(resolve, reject) {
        mongodb.MongoClient.connect(dburi, function(error, db) {
            var bucket = new mongodb.GridFSBucket(db);

            fs.createReadStream(filePath).
                pipe(bucket.openUploadStream(trackId)).
                on('error', function(error) {
                    reject(error);
                }).
                on('finish', function() {
                    resolve(true);
                });
        });
    });
};

module.exports = cacheBuilderService;
