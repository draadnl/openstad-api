const fs = require('fs'); // Needed for example below
const moment = require('moment')
const { exec } = require('child_process');
const s3 = require('../services/awsS3');

const backupMongoDBToS3 = async () => {
    if (process.env.S3_MONGO_BACKUPS === 'ON') {
      const host = process.env.MONGO_DB_HOST || 'localhost';
      const port = process.env.MONGO_DB_PORT || 27017;
      const tmpDbFile = 'db_mongo';
      const isOnK8s = !!process.env.KUBERNETES_NAMESPACE;
      const namespace = process.env.KUBERNETES_NAMESPACE;

      // Default command, does not considers username or password
      let command = `mongodump -h ${host} --port=${port} --archive=${tmpDbFile}`;

      // When Username and password is provided
      // /
      //if (username && password) {
      //    command = `mongodump -h ${host} --port=${port} -d ${database} -p ${password} -u ${username} --quiet --gzip --archive=${BACKUP_PATH(DB_BACKUP_NAME)}`;
      //}

      exec(command, (err, stdout, stderr) => {
          if (err) {
              // Most likely, mongodump isn't installed or isn't accessible
            console.log('errere', err);
          } else {
            const created = moment().format('YYYY-MM-DD hh:mm:ss')
            const fileContent = fs.readFileSync(tmpDbFile);

            const key = isOnK8s ? `mongodb/${namespace}/mongo_${created}` : `mongodb/mongo_${created}`;
            var params = {
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: fileContent,
                ACL: "private"
            };
            
            const client = s3.getClient();

            client.putObject(params, function(err, data) {
                if (err) console.log(err, err.stack);
                else     console.log(data);
            });
          }
      });
    }
}


/*
  ENV values needed:

  MONGO_DB_HOST
  S3_DBS_TO_BACKUP
  S3_ENDPOINT
  S3_KEY
  S3_SECRET
  S3_MYSQL_BUCKET
 */

module.exports = {
	cronTime: '0 0 1 * * *',
	runOnInit: true,
	onTick: async function() {
    backupMongoDBToS3();
	}
};
