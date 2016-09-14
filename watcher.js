var watch = require('node-watch');
var mongoose = require("mongoose");
var fs = require('fs');
var path = require('path');
var Artist = require("./model/schemas/artists");
var Track = require("./model/schemas/tracks");
var tagReader = require("jsmediatags");

//TODO: use this to add hashmap of paths and then process after
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');
//var HashMap = require('hashmap');

// Connect to mongodb database
mongoose.connect("mongodb://localhost/test-music-app");

//TODO: avoid chained calls
watch('/home/music-library/tune-library', { recursive: true, followSymLinks: true }, function(filepath) {

    fs.stat(filepath, function(err, stat) {
        if (err == null) {
            var extension = path.extname(filepath);
            if (extension == '.mp3' || extension == '.m4a') {
                tagReader.read(filepath, {
                    onSuccess: function(tag) {
                        //console.log(tag.tags.artist)
                        //console.log(tag.tags.album)

                        Artist.find({ name: tag.tags.artist }, function(err, artist) {
                            var artistId = null;
                            if (artist.length > 1) {
                                console.error('Multiple artists returned of the same name');
                            }

                            //if (artist == null || artist[0].toObject().name == null) {
                            if (artist[0] == null) {
                                var newArtist = new Artist({
                                    name: tag.tags.artist
                                });

                                newArtist.save(function (err, artistCallback) {
                                    if (err == null) {
                                        console.log('Artist ID: ' + artistCallback.id);
                                        artistId = artistCallback.id;
                                        addTrack(artistId, extension, filepath, tag);
                                    }
                                    else {
                                        console.error('Could not persist [' + tag.tags.artist + '] to DB');
                                    }
                                });
                            }
                            else {
                                artistId = artist[0].toObject()._id;
                                console.log('This should be the new ID: ' + artistId);
                                console.log('Length: ' + artist.length);
                                //TODO: remove dup call
                                addTrack(artistId, extension, filepath, tag);
                            }
                        });


                    }
                });
            }
            else {
                console.error('File type [' + extension + '] not supported, ignoring');
            }
        }
    });

    console.log(filepath, ' changed.');
});

function addTrack(artistId, extension, filepath, tag) {
    if (artistId != null) {

        Track.find({ title: tag.tags.title }, function(err, track) {
            if (track[0] == null) {
                var encoding = '';
                if (extension == '.mp3') {
                    encoding = 'audio/mpeg';
                }
                else if (extension == '.m4a') {
                    encoding = 'audio/mp4';
                }

                var newTrack = new Track({
                    albumId: 'n/a',
                    artistId: artistId,
                    title: tag.tags.title,
                    year: tag.tags.year,
                    location: filepath,
                    encoding: encoding
                });

                newTrack.save(function (err, trackCallbakc) {
                    if (err == null) {
                        console.log('Track added with ID: ' + trackCallbakc.id);
                    }
                    else {
                        console.error('Could not persist [' + tag.tags.title + '] by [' + tag.tags.artist + '] to DB');
                    }
                });
            }
            else {
                //track with same name found (this is possible) - handle this, maybe compare
                //artist ID and album ID of document too. If these differ, then it's just a
                //coincidence the names are the same so continue to add track anyway
            }
        });
    }
    else {
        console.error('An artistId is not present, cannot save track');
    }
}
