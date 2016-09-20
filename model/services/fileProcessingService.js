var path = require('path');
var tagReadingService = require('./tagReadingService');
var databaseService = require('./databaseService');

var fileProcessingService = {};

fileProcessingService.processFilesystemChanges = function(filepaths) {
    if (filepaths != null) {
        var prevPromise = Promise.resolve();

        filepaths.forEach(function(filepath) {
            console.log('Processing track change for [' + filepath + ']');

            if (checkValidExtension(filepath)) {
                prevPromise = prevPromise.then(function() {
                    return tagReadingService.getTags(filepath, ['artist', 'album']);
                }).then(function(results) {
                    var artist = results[0];
                    var album = results[1];

                    if (artist != null && album != null) {
                        console.log('Artist [' + artist + '] and album [' + album + '] found in file tags');
                        //TODO: when there is no artist of album in the DB, these following dbService lines
                        //can execute at the same time and you get a race condition in Mongoose where
                        //two new artists or albums are added - this really needs to be synchronous
                        databaseService.checkOrAddArtist(artist).then(function(id) {
                            var artistId = id;
                            databaseService.checkOrAddAlbum(artistId, album).then(function(id) {
                                var albumId = id;
                                databaseService.addTrack(albumId, artistId, filepath);
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
};

function checkValidExtension(filepath) {
    var valid = false;
    var extension = path.extname(filepath);
    if (extension == '.mp3' || extension == '.m4a' || extension == '.wav') {
        valid = !valid;
    }

    return valid;
}

module.exports = fileProcessingService;
