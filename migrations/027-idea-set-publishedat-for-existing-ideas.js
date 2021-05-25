var db = require('../src/db').sequelize;

module.exports = {
	up: function() {
		try {
			return db.query(`
			  UPDATE ideas SET publishedAt = createdAt;
			`);
		} catch(e) {
			return true;
		}
	}
}
