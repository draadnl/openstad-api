const createHttpError = require('http-errors');

module.exports = async function hasOrganisation(user) {
  if (['admin', 'moderator', 'editor'].includes(user.role)) {
    return true
  }
  if (!user.organisationId) {
    throw createHttpError(400, 'Je bent geen onderdeel van een organisatie');
  }
  return true;
};
