const backupsMap = {
  'mongo': 'mongodb_s3_backups',
  'mysql': 'mysql_s3_backups'
};

if (!!process.env.BACKUP_TYPE === false) {
  console.error ('No backup type given in ENV variables');
  process.exit(1);
}

if (Object.keys(backupsMap).indexOf(process.env.BACKUP_TYPE) === -1) {
  console.error ('Backup type not supported');
  process.exit(1);
}

const backup = require(`./src/cron/${backupsMap[process.env.BACKUP_TYPE]}`);

async function run() {
  try {
    await backup.onTick();
  } catch (err) {
    console.error('Backup went wrong', err);
  }
}

run();
