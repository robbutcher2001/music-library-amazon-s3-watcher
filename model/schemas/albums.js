var mongoose = require("mongoose");
var albumSchema = mongoose.Schema({
    artistId: String,
    name: String
});

module.exports = mongoose.model("albums", albumSchema);
