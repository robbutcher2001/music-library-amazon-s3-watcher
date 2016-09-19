var fs = require('fs');
var tagReader = require('jsmediatags');

var tagReadingService = {};

tagReadingService.getTags = function(filepath, tagsRequested) {
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
};

module.exports = tagReadingService;
