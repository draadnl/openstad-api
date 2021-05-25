var db = require('../src/db').sequelize;

module.exports = {
	up: function() {
		try {
			return db.query(`
			  ALTER TABLE ideas ADD publishedAt DATETIME NULL DEFAULT NOW() AFTER deletedAt;
			`);
		} catch(e) {
			return true;
		}
	},
	down: function() {
		return db.query(`ALTER TABLE ideas DROP publishedAt;`);
	}
}
