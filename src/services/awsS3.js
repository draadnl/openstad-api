const AwsS3 = require('aws-sdk');

const getClient = () => {
  const spacesEndpoint = new AwsS3.Endpoint(process.env.S3_ENDPOINT);
  
  const s3Config = {
    endpoint:        spacesEndpoint,
    accessKeyId:     process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET
  }
  
  if (process.env.S3_FORCE_PATH_STYLE) {
    s3Config.s3ForcePathStyle = process.env.S3_FORCE_PATH_STYLE;
  }
  
  return new AwsS3.S3(s3Config);
}


module.exports = {getClient};



