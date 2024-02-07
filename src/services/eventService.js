const jsonLogic = require('json-logic-js');
const notificationService = require('./notificationService');

/**
 * Publish an event
 * This method checks if there is any ruleset available for the published event
 *
 * @param {object} notificationRuleSet
 * @param {int} siteId
 * @param {{resource: string, eventType: string, instance: object}} ruleSetData
 * @returns {Promise<void>}
 */
const publish = async (notificationRuleSet, siteId, ruleSetData) => {

  console.log('Publish event called: ', ruleSetData.resource, ruleSetData.eventType);

  const ruleSets = await notificationRuleSet
    .scope('includeTemplate', 'includeRecipients')
    .findAll({where: { siteId, active: 1}})

  ruleSets.forEach((ruleset) => {
    if (jsonLogic.apply(ruleset.body, ruleSetData) === false) {
      console.log('ruleset doesnt match', ruleset.id, ruleset.body);
      return false;
    }
    console.log('Matched ruleset', ruleSetData.resource, ruleSetData.eventType)
    const { notification_template, notification_recipients } = ruleset;

    const recipients = notification_recipients.map(recipient => {
      const user = {};
      if (recipient.emailType === 'field') {
        // Check if ruleSetData.instance exists and has the required properties
        if (ruleSetData.instance && ruleSetData.instance.submittedData && ruleSetData.instance.submittedData.email) {
          user.email = ruleSetData.instance.submittedData.email;
        } else {
          console.error('Error: Email field not found in ruleSetData.instance', ruleSetData.instance);
          return null;
        }
      }
      if (recipient.emailType === 'fixed') {
        user.email = recipient.value;
      }

      console.log('Recipient:', user); // Extra log toegevoegd

      return user;
    });

    if (recipients.length === 0) {
      console.error('No recipients found for ruleset id: ', ruleset.id);
    }

    const emailData = {
      subject: notification_template.subject,
      text: notification_template.text,
      template: notification_template.templateFile,
      ...(ruleSetData.instance && ruleSetData.instance.get()) // Check if ruleSetData.instance exists before spreading
    };

    console.log('Email data:', emailData); // Extra log toegevoegd

    // Todo: instead of directly notify we should use a decent queue
    recipients
      .filter(recipient => recipient && recipient.email) // Filter out null recipients
      .forEach(recipient => {
        console.log('Notify recipient', recipient.email);
        notificationService.notify(emailData, recipient, siteId);
      });
  });
}

module.exports = {
  publish
}
