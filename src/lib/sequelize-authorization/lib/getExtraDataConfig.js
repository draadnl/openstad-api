// TODO: verplaatsen; hoort niet in de generieke sequelize-authoriztion

const userHasRole = require('./hasRole');
var sanitize = require('../../../util/sanitize');

module.exports = function (dataTypeJSON,  siteConfigKey) {
  return {
    type: dataTypeJSON,
    allowNull: false,
    defaultValue: {},
    get: function () {
      let value =  this.getDataValue('extraData');
      console.log('ExtraData opgehaald:', value);
      try {
        if (typeof value == 'string') {
          value = JSON.parse(value);
          console.log('ExtraData is een string en wordt geparsed:', value);
        }
      } catch (err) {
        console.error('Fout bij het parsen van extraData:', err);
      }

      console.log('Retourneren van waarde:', value);
      return value;
    },
    set: function (value) {
      console.log('Inkomende extraData:', value);
      try {
        if (typeof value == 'string') {
          value = JSON.parse(value);
          console.log('Inkomende extraData is een string en wordt geparsed:', value);
        }
      } catch (err) {
        console.error('Fout bij het parsen van inkomende extraData:', err);
      }

      let oldValue =  this.getDataValue('extraData') || {};
      console.log('Oude extraData:', oldValue);

      // new images replace old images
      if (value && value.images) {
        oldValue.images = [];
        console.log('Nieuwe afbeeldingen vervangen oude afbeeldingen.');
      }

      try {
        if (typeof oldValue == 'string') {
          oldValue = JSON.parse(oldValue) || {};
          console.log('Oude extraData is een string en wordt geparsed:', oldValue);
        }
      } catch (err) {
        console.error('Fout bij het parsen van oude extraData:', err);
      }

      function fillValue(old, val) {
        old = old || {};
        Object.keys(old).forEach((key) => {
          if (val[key] && typeof val[key] == 'object') {
            return fillValue(old[key], val[key]);
          }
          if (val[key] === null) {
            // send null to delete fields
            delete val[key];
            console.log(`Veld "${key}" wordt verwijderd.`);
          } else if (typeof val[key] == 'undefined') {
            // not defined in put data; use old val
            val[key] = old[key];
            console.log(`Veld "${key}" is niet gedefinieerd in de invoerdata; oude waarde wordt gebruikt.`);
          }

          if (typeof val[key] === 'string') {
            val[key] = sanitize.safeTags(val[key]);
            console.log(`Veld "${key}" wordt veilig gemaakt.`);
          }
        });
      }

      fillValue(oldValue, value);

      // ensure images is always an array
      if (value.images && typeof value.images === 'string') {
        value.images = [value.images];
        console.log('Afbeeldingen worden omgezet naar een array:', value.images);
      }

      console.log( 'Data set:', value );
      this.setDataValue('extraData', value);
    },
    auth: {
      viewableBy: 'all',
      authorizeData: function(data, action, user, self, site) {

        if (!site) return; // todo: die kun je ophalen als eea. async is
        data = data || self.extraData;
        data = typeof data === 'object' ? data : {};
        let result = {};

        let userId = self.userId;
        if (self.toString().match('SequelizeInstance:user')) { // TODO: find a better check
          userId = self.id
        }

        if (data) {
          Object.keys(data).forEach((key) => {

            let testRole = site.config && site.config[siteConfigKey] && site.config[siteConfigKey].extraData && site.config[siteConfigKey].extraData[key] && site.config[siteConfigKey].extraData[key].auth && site.config[siteConfigKey].extraData[key].auth[action+'ableBy'];
            testRole = testRole || self.rawAttributes.extraData.auth[action+'ableBy'];
            testRole = testRole || ( self.auth && self.auth[action+'ableBy'] ) || [];
            if (!Array.isArray(testRole)) testRole = [testRole];

            if (testRole.includes('detailsViewableByRole')) {
              if (self.detailsViewableByRole) {
                testRole = [ self.detailsViewableByRole, 'owner' ];
              }
            }

            if (userHasRole(user, testRole, userId)) {
              result[key] = data[key];
            }
          });
        }

        return result;
      },
    }
  };
}
