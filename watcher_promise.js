var watch = require('node-watch');
var mongoose = require("mongoose");
var fs = require('fs');
var path = require('path');
var Artist = require("./model/schemas/artists");
var Album = require("./model/schemas/albums");
var Track = require("./model/schemas/tracks");
var tagReader = require("jsmediatags");

// Connect to mongodb database
mongoose.connect("mongodb://localhost/test-music-app");
mongoose.Promise = Promise;

var tracksToCheck = [];
var uniqueArray;

//TODO: avoid chained calls
watch('/Users/rbutcher/Music/iTunes/iTunes Media/Music', { recursive: true, followSymLinks: true }, function(filepath) {

    tracksToCheck.push(filepath);
    uniqueArray = tracksToCheck.filter(function(item, pos) {
        return tracksToCheck.indexOf(item) == pos;
    });
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
                        Promise.all([checkOrAddArtist(artist), checkOrAddAlbum(album)]).then(function(ids) {
                            var artistId = ids[0];
                            var albumId = ids[1];
                            addTrack(albumId, artistId, filepath);
                        }).catch(function(error) {
                            //why does this only print one error for .wav files?
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

        //clear array
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
                        console.log('Artist added to DB with new ID [' + artistId + ']');
                    }
                    else {
                        console.error('Could not persist [' + artist + '] to DB');
                    }
                });
            }
            else {
                artistId = results[0].toObject()._id;
                console.log('Artist already exists in DB with ID [' + artistId + ']');
            }

            resolve(artistId);
        });
    });
}

function checkOrAddAlbum(album) {
    return new Promise(function(resolve, reject) {
        Album.find({ name: album }, function(err, results) {
            var albumId = null;

            if (results.length > 1) {
                console.error('Multiple albums returned of the same name');
            }

            if (results[0] == null) {
                var newAlbum = new Album({
                    artistId: '?',
                    name: album
                });

                newAlbum.save(function (err, albumCallback) {
                    if (err == null) {
                        albumId = albumCallback.id;
                        console.log('Album added to DB with new ID [' + albumId + ']');
                    }
                    else {
                        console.error('Could not persist [' + album + '] to DB');
                    }
                });
            }
            else {
                albumId = results[0].toObject()._id;
                console.log('Album already exists in DB with ID [' + albumId + ']');
            }

            resolve(albumId);
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

            Track.find({ name: title }, function(err, track) {
                if (track.length > 1) {
                    console.error('Multiple tracks returned of the same name');
                }

                //TODO: check albumId and artistId same too and not just track name
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
            });
        });
    }
    else {
        console.error('An artistId or albumId is not present, cannot save track');
    }
}

setInterval(function () {
    processFilesystemChanges(uniqueArray);
}, 1000 * 20);
