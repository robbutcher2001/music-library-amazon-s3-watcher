// Impl from: http://mongodb.github.io/node-mongodb-native/2.2/tutorials/gridfs/streaming/
var fs = require('fs');
var mongodb = require('mongodb');

const dburi = 'mongodb://database-service-container/music-track-cache-db';

var cacheManagementService = {};

cacheManagementService.putCache = function(filePath, trackId) {
    return new Promise(function(resolve, reject) {
        mongodb.MongoClient.connect(dburi, function(error, db) {
            var bucket = new mongodb.GridFSBucket(db);

            fs.createReadStream(filePath).
                pipe(bucket.openUploadStream(trackId)).
                on('error', function(error) {
                    reject(error);
                }).
                on('finish', function() {
                    resolve();
                });
        });
    });
};

cacheManagementService.getCache = function(trackId) {
    return new Promise(function(resolve, reject) {
        mongodb.MongoClient.connect(dburi, function(error, db) {
            var bucket = new mongodb.GridFSBucket(db);
            const retrievedName = './media/' + trackId;

            bucket.openDownloadStreamByName(trackId).
                pipe(fs.createWriteStream(retrievedName)).
                on('error', function(error) {
                    reject(error);
                }).
                on('finish', function(file) {
                    resolve(retrievedName);
                });
        });
    });
};

module.exports = cacheManagementService;
