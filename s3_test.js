// Load the S3 SDK for JavaScript
// TODO: add only call to S3
// var AWS = require('aws-sdk/clients/s3');
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
// TODO: regen and move to DB and store in private container image
// http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials.html
AWS.config.loadFromPath('./s3_config.json');

// Create S3 service object
s3 = new AWS.S3();

var allKeys = [];
var params = {
    Bucket: 'robertbutcher.co.uk-music-library'
};

listAllKeys();

function listAllKeys() {
    s3.listObjectsV2(params, function (err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        } else {
            var contents = data.Contents;
            contents.forEach(function (content) {
                allKeys.push(content.Key);
            });

            if (data.IsTruncated) {
                params.ContinuationToken = data.NextContinuationToken;
                console.log("get further list...");
                listAllKeys();
            }

        }
    });
};

// Call S3 to list current buckets
