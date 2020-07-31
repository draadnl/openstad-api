var db = require('../src/db').sequelize;

module.exports = {
  up: function() {
    return db.query(`
      ALTER TABLE ideas MODIFY COLUMN \`status\` enum(
          'OPEN',
          'CLOSED',
          'ACCEPTED',
          'DENIED',
          'BUSY',
          'DRAFT'
      )
      NOT NULL AFTER \`sort\`;
		`);
  },
  down: function() {
    return db.query(`
      ALTER TABLE ideas MODIFY COLUMN \`status\` enum(
          'OPEN',
          'CLOSED',
          'ACCEPTED',
          'DENIED',
          'BUSY',
      )
      NOT NULL AFTER \`sort\`;
		`);
  }
}
