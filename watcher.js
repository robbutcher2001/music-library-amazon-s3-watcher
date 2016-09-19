var watch = require('node-watch');
var mongoose = require("mongoose");
var fs = require('fs');
var path = require('path');
var Artist = require("./model/schemas/artists");
var Album = require("./model/schemas/albums");
var Track = require("./model/schemas/tracks");
var tagReader = require("jsmediatags");

//TODO: use this to add hashmap of paths and then process after
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');
//var HashMap = require('hashmap');

// Connect to mongodb database
mongoose.connect("mongodb://localhost/test-music-app");
mongoose.Promise = Promise;

var tracksToCheck = [];

watch('/Users/rbutcher/Music/iTunes/iTunes Media/Music', { recursive: true, followSymLinks: true }, function(filepath) {
    tracksToCheck.push(filepath);
});

function processFilesystemChanges(filepaths) {
    if (filepaths != null) {
        var prevPromise = Promise.resolve();

        filepaths.forEach(function(filepath) {
            console.log("Processing track change for [" + filepath + "]");

            if (checkValidExtension(filepath)) {
                prevPromise = prevPromise.then(function() {
                    return getTags(filepath, ['artist', 'album']);
                }).then(function(results) {
                    var artist = results[0];
                    var album = results[1];

                    if (artist != null && album != null) {
                        console.log('Artist [' + artist + '] and album [' + album + '] found in file tags');
                        checkOrAddArtist(artist).then(function(id) {
                            var artistId = id;
                            checkOrAddAlbum(artistId, album).then(function(id) {
                                var albumId = id;
                                addTrack(albumId, artistId, filepath);
                            }).catch(function(error) {
                                console.error(error);
                            });
                        }).catch(function(error) {
                            console.error(error);
                        });
                    }
                    else {
                        console.error('Could not identify both artist and album from track, ignoring..');
                    }
                }).catch(function(error) {
                    console.error(error);
                });
            }
            else {
                console.error('File type [' + filepath + '] not supported, ignoring');
            }
        });
    }
}

function getFileExtension(filepath) {
    return path.extname(filepath);
}

function checkValidExtension(filepath) {
    var valid = false;
    var extension = getFileExtension(filepath);
    if (extension == '.mp3' || extension == '.m4a' || extension == '.wav') {
        valid = !valid;
    }

    return valid;
}

function getTags(filepath, tagsRequested) {
    return new Promise(function(resolve, reject) {
        var tagsResolved = [];
        fs.stat(filepath, function(err, stat) {
            if (err == null) {
                tagReader.read(filepath, {
                    onSuccess: function(tags) {
                        for (i = 0; i < tagsRequested.length; i++) {
                            switch (tagsRequested[i]) {
                                case 'artist':
                                    tagsResolved.push(tags.tags.artist);
                                    break;
                                case 'album':
                                    tagsResolved.push(tags.tags.album);
                                    break;
                                case 'title':
                                    tagsResolved.push(tags.tags.title);
                                    break;
                                case 'year':
                                    tagsResolved.push(tags.tags.year);
                                    break;
                            }
                        }

                        resolve(tagsResolved);
                    },
                    onError: function(error) {
                        reject('Could not identify [' + tagRequested + '] from track: ' +  error.info);
                    }
                });
            }
            else {
                console.error(err);
            }
        });
    });
}

function checkOrAddArtist(artist) {
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
}

function checkOrAddAlbum(artistId, album) {
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
}

function addTrack(albumId, artistId, filepath) {
    var extension = getFileExtension(filepath);

    if (albumId != null && artistId != null) {
        var encoding = 'audio';
        if (extension == '.mp3') {
            encoding = 'audio/mpeg';
        }
        else if (extension == '.m4a') {
            encoding = 'audio/mp4';
        }

        getTags(filepath, ['title', 'year']).then(function(results) {
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
}

setInterval(function () {
    var uniqueArray = tracksToCheck.filter(function(item, pos) {
        return tracksToCheck.indexOf(item) == pos;
    });
    tracksToCheck = [];
    processFilesystemChanges(uniqueArray);
}, 1000 * 20);
