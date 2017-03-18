var mongoose = require('mongoose');
var Artist = require('../schemas/artists');
var Album = require('../schemas/albums');
var Track = require('../schemas/tracks');
var tagReadingService = require('./tagReadingService');
var path = require('path');

var databaseService = {};

//TODO: use this to add hashmap of paths and then process after
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');
//var HashMap = require('hashmap');

// Connect to mongodb database
mongoose.connect('mongodb://database-service-container/music-app-db');
mongoose.Promise = Promise;

databaseService.checkOrAddArtist = function(artist) {
    return new Promise(function(resolve, reject) {
        Artist.find({ name: artist }, function(err, results) {
            var artistId = null;

            if (results.length > 1) {
                console.error('Multiple artists returned of the same name');
            }

            if (results[0] == null) {
                var newArtist = new Artist({
                    name: artist
                });

                newArtist.save(function (err, artistCallback) {
                    if (err == null) {
                        artistId = artistCallback.id;
                        resolve(artistId);
                        console.log('Artist added to DB with new ID [' + artistId + ']');
                    }
                    else {
                        console.error('Could not persist [' + artist + '] to DB');
                    }
                });
            }
            else {
                artistId = results[0].toObject()._id;
                resolve(artistId);
                console.log('Artist already exists in DB with ID [' + artistId + ']');
            }
        });
    });
};

databaseService.checkOrAddAlbum = function(artistId, album) {
    return new Promise(function(resolve, reject) {
        Album.find({ name: album }, function(err, results) {
            var albumId = null;

            if (results.length > 1) {
                console.error('Multiple albums returned of the same name');
            }

            if (results[0] == null) {
                var newAlbum = new Album({
                    artistId: artistId,
                    name: album
                });

                newAlbum.save(function (err, albumCallback) {
                    if (err == null) {
                        albumId = albumCallback.id;
                        resolve(albumId);
                        console.log('Album added to DB with new ID [' + albumId + ']');
                    }
                    else {
                        console.error('Could not persist [' + album + '] to DB');
                    }
                });
            }
            else {
                albumId = results[0].toObject()._id;
                resolve(albumId);
                console.log('Album already exists in DB with ID [' + albumId + ']');
            }
        });
    });
};

databaseService.addTrack = function(albumId, artistId, filepath) {
    var extension = path.extname(filepath);

    if (albumId != null && artistId != null) {
        var encoding = 'audio';
        if (extension == '.mp3') {
            encoding = 'audio/mpeg';
        }
        else if (extension == '.m4a') {
            encoding = 'audio/mp4';
        }

        tagReadingService.getTags(filepath, ['title', 'year']).then(function(results) {
            var title = results[0];
            var year = results[1];

            Track.find({ title: title }).where('albumId').eq(albumId).exec(function(err, track) {
                if (track.length > 1) {
                    console.error('Multiple tracks returned of the same name for same album');
                }

                if (track[0] == null) {
                    var newTrack = new Track({
                        albumId: albumId,
                        artistId: artistId,
                        title: title,
                        extension: extension,
                        year: year,
                        location: filepath,
                        encoding: encoding
                    });

                    newTrack.save(function (err, trackCallback) {
                        if (err == null) {
                            console.log('New track added to DB [' + title + ':' + trackCallback.id + ']');
                        }
                        else {
                            console.error('Could not persist [' + title + '] to DB');
                        }
                    });
                }
                else {
                    console.log('Track [' + track[0].toObject()._id + '] already exists, ignoring');
                }
            });
        });
    }
    else {
        console.error('An artistId or albumId is not present, cannot save track [' + filepath + ']');
    }
};

module.exports = databaseService;
