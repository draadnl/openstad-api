var db = require('../src/db').sequelize;

module.exports = {
	up: function() {
		try {
			return db.query(`
			  UPDATE articles SET publishedAt = createdAt;
			`);
		} catch(e) {
			return true;
		}
	}
}
