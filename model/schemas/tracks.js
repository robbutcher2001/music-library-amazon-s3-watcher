var mongoose = require('mongoose');
var trackSchema = mongoose.Schema({
    albumId: String,
    artistId: String,
    title: String,
    extension: String,
    year: String,
    s3key: String,
    encoding: String
});

module.exports = mongoose.model('tracks', trackSchema);
