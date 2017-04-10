var mongoose = require('mongoose');
var Artist = require('../schemas/artists');
var Album = require('../schemas/albums');
var Track = require('../schemas/tracks');

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
        if (artist == null) {
            artist = '<Unknown Artist>';
        }
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
                        console.log('New artist [' + artist + '] added to DB with new ID [' + artistId + ']');
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
        if (album == null) {
            album = '<Unknown Album>';
        }
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
                        console.log('New album [' + album + '] added to DB with new ID [' + albumId + ']');
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

//fixed now?
//TODO: make this a Promise so that when called in the s3MusicService, we can move the
// recursive 'if (index < trackKeys.length)' block up to when this returns.
// Should prevent the following output happening:
// New artist [Viceroy] added to DB with new ID [58da7712ba72fe4d6413977a]
// New album [Vita Tapes] added to DB with new ID [58da7712ba72fe4d6413977b]
// New track added to DB [Viceroy & Vitacoco's Vita Tapes Vol. 2:58da7712ba72fe4d6413977c]
// Processing complete {this completes before last 3 lines run}
// New artist [Jamie Woon] added to DB with new ID [58da7722ba72fe4d6413977d]
// New album [www.soundcloud.com/groovedoctormusic] added to DB with new ID [58da7722ba72fe4d6413977e]
// New track added to DB [Lady Luck (The Groovedoctor edit) remaster:58da7722ba72fe4d6413977f]
databaseService.addTrack = function(albumId, artistId, extension, s3key, title, year) {
    return new Promise(function(resolve, reject) {
        if (albumId != null && artistId != null) {
            var encoding = 'audio';
            if (extension == 'mp3') {
                encoding = 'audio/mpeg';
            }
            else if (extension == 'm4a') {
                encoding = 'audio/mp4';
            }

            Track.find({ title: title }).where('albumId').eq(albumId).exec(function(err, track) {
                if (track.length > 1) {
                    console.error('Multiple tracks returned of the same name for same album');
                    reject();
                }

                if (track[0] == null) {
                    var newTrack = new Track({
                        albumId: albumId,
                        artistId: artistId,
                        title: title,
                        extension: extension,
                        year: year,
                        s3key: s3key,
                        encoding: encoding
                    });

                    newTrack.save(function (err, trackCallback) {
                        if (err == null) {
                            console.log('New track added to DB [' + title + ':' + trackCallback.id + ']');
                            resolve(trackCallback.id);
                        }
                        else {
                            console.error('Could not persist [' + title + '] to DB');
                            reject();
                        }
                    });
                }
                else {
                    console.log('Track [' + track[0].toObject()._id + '] already exists, ignoring');
                    resolve(track[0].toObject()._id);
                }
            });
        }
        else {
            console.error('An artistId or albumId is not present, cannot save track [' + s3key + ']');
            reject();
        }
    });
};

databaseService.checkTrackExists = function(s3key) {
    return new Promise(function(resolve, reject) {
        Track.find({ s3key: s3key }, function(err, tracks) {
            if (tracks.length > 1) {
                console.error('Multiple tracks returned with the same S3 key');
            }

            var found = false;
            if (tracks[0] != null) {
                found = true;
            }

            resolve(found);
        });
    });
};

module.exports = databaseService;
