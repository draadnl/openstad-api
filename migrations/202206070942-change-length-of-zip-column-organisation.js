var db = require('../src/db').sequelize;

/**
 *
 */
module.exports = {
  up: function () {
    try {
      return db.query(`
        ALTER TABLE \`organisations\`
          MODIFY COLUMN \`zip\` VARCHAR(255) NULL;
        ALTER TABLE \`organisations\`
          MODIFY COLUMN \`phone\` VARCHAR(255) NULL;
      `);
    } catch (e) {
      console.error('Migration:up failed:', e.message);s
      return true;
    }
  },
  down: function () {
    return db.query(`
        ALTER TABLE \`organisations\`
          MODIFY COLUMN \`zip\` VARCHAR(6) NULL;
        ALTER TABLE \`organisations\`
          MODIFY COLUMN \`phone\` VARCHAR(10) NULL;
    `);
  },
};
