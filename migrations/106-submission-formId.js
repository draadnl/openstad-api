var db = require('../src/db').sequelize;

module.exports = {
  up: function() {
    return db.query(`
		  ALTER TABLE submissions ADD formId VARCHAR(255) NULL AFTER userId;
		`);
  },
  down: function() {
    return db.query(`ALTER TABLE submissions DROP formId;`);
  }
}
