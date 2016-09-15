var mongoose = require("mongoose");
var trackSchema = mongoose.Schema({
    albumId: String,
    artistId: String,
    title: String,
    year: String,
    location: String,
    encoding: String
});

module.exports = mongoose.model("tracks", trackSchema);
