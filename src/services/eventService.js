const jsonLogic = require('json-logic-js');
const notificationService = require('./notificationService');
const log = require('debug')('event:publish');

// Todo: move to helper or util file
/**
 * Checks if string is valid json
 * @param {string} str
 * @returns {boolean}
 */
function isJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Publish an event
 * This method checks if there is any ruleset available for the published event
 *
 * @param {object} notificationRuleSet
 * @param {int} siteId
 * @param {object} ruleSetData
 * @returns {Promise<void>}
 */
const publish = async (notificationRuleSet, siteId, ruleSetData) => {
  console.log(notificationRuleSet, siteId, ruleSetData);
  const ruleSets = await notificationRuleSet
      .scope('includeTemplate', 'includeRecipients')
      .findAll({ where: { siteId, active: 1 } });

  console.log(ruleSets);

  ruleSets.forEach((ruleset) => {
    const rulesetString = ruleset.body;

    console.log('Rule set string:', rulesetString);

    if (jsonLogic.apply(ruleset.body, ruleSetData) === false) {
      console.log('ruleset doesnt match', ruleset.id, ruleset.body);
      return false;
    }
    
      const { notification_template, notification_recipients } = ruleset;

      const recipients = notification_recipients.map(recipient => {
        const user = {};
        if (recipient.emailType === 'field') {
          // get email field from resource instance, can be dot separated (e.g. submittedData.email)
          let userEmail = '';
          try {
            userEmail = recipient.value.split('.').reduce((o, i) => o[i], ruleSetData.instance);
          } catch (error) {
            log('Error accessing email field from resource instance:', error.message);
            log('Falling back to previous method...');
            userEmail = ruleSetData.instance.submittedData.email; // Fallback to previous method
          }
          user.email = userEmail;
        }
        if (recipient.emailType === 'fixed') {
          user.email = recipient.value;
        }

        return user;
      });

      const emailData = {
        subject: notification_template.subject,
        text: notification_template.text,
        template: notification_template.templateFile,
        ...ruleSetData.instance.get()
      };

      console.log('Email Data:', emailData);
      console.log('Recipients:', recipients);

      // Todo: instead of directly notify we should use a decent queue
      recipients
          .filter(recipient => recipient.email)
          .forEach(recipient => notificationService.notify(emailData, recipient, siteId));
  });
};

module.exports = {
  publish
};