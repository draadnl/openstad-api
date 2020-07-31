var db = require('../src/db').sequelize;

module.exports = {
  up: function() {
    return db.query(`
		  ALTER TABLE submissions ADD ideaId int(11) NULL AFTER formId,
		  ADD KEY \`ideaId\` (\`ideaId\`),
      ADD CONSTRAINT \`idea_submission\` FOREIGN KEY (\`ideaId\`) REFERENCES \`ideas\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;
		  
		`);
  },
  down: function() {
    return db.query(`ALTER TABLE submissions DROP ideaId;`);
  }
}
