var mongoose = require("mongoose");
var artistSchema = mongoose.Schema({
    name: String
});

module.exports = mongoose.model("artists", artistSchema);
