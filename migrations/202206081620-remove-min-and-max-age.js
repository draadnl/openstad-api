var db = require('../src/db').sequelize;

/**
 *
 */
module.exports = {
  up: function () {
    try {
      return db.query(`
        ALTER TABLE \`events\`
          MODIFY COLUMN \`minAge\` INT(11) NULL;
        ALTER TABLE \`events\`
          MODIFY COLUMN \`maxAge\` INT(11) NULL;
      `);
    } catch (e) {
      console.error('Migration:up failed:', e.message);s
      return true;
    }
  },
  down: function () {
    return db.query(`
        ALTER TABLE \`events\`
          MODIFY COLUMN \`minAge\` INT(11) NOT NULL;
        ALTER TABLE \`events\`
          MODIFY COLUMN \`maxAge\` INT(11) NOT NULL;
    `);
  },
};
