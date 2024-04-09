const merge             = require('merge');
const config            = require('config');
const defaultSiteConfig = require('./defaultSiteConfig');

class MailConfig {

  constructor(site) {

    let self = this;
    self.config = merge.recursive(true, defaultSiteConfig, config || {});

    // Exceptions from local config because field names don't match
    self.config.cms.url = self.config.url || self.config.title;
    self.config.cms.hostname = self.config.hostname || self.config.title;
    self.config.title = self.config.siteName || self.config.title;
    self.config.newslettersignup.confirmationEmail.attachments = (self.config.ideas && self.config.ideas.feedbackEmail && self.config.ideas.feedbackEmail.attachments) || self.config.newslettersignup.confirmationEmail.attachments;
    self.config.newslettersignup.confirmationEmail.subject = (self.config.ideas && self.config.ideas.feedbackEmail && self.config.ideas.feedbackEmail.subject) || self.config.newslettersignup.confirmationEmail.subject;

    self.config = merge.recursive(self.config, site.config || {});

    // Put the title in the config as well
    self.config.title = site.title || self.config.title;

    return self;

  }

  getTitle() {
    const title = this.config.title;
    console.log(`Getting title: ${title}`);
    return title;
  }

  getCmsUrl() {
    const url = this.config.cms.url;
    console.log(`Getting CMS URL: ${url}`);
    return url;
  }

  getCmsHostname() {
    const hostname = this.config.cms.hostname;
    console.log(`Getting CMS hostname: ${hostname}`);
    return hostname;
  }

  getResourceConfig(resourceType) {
    const resourceConfig = this.config[resourceType] || {};
    console.log(`Getting resource config for ${resourceType}:`, resourceConfig);
    return resourceConfig;
  }

  getResourceFeedbackEmail(resourceType) {
    const feedbackEmail = this.getResourceConfig(resourceType).feedbackEmail || {};
    console.log(`Getting resource feedback email for ${resourceType}:`, feedbackEmail);
    return feedbackEmail;
  }

  getResourceConceptEmail(resourceType) {
    const conceptEmail = this.getResourceConfig(resourceType).conceptEmail || {};
    console.log(`Getting resource concept email for ${resourceType}:`, conceptEmail);
    return conceptEmail;
  }

  getResourceConceptToPublishedEmail(resourceType) {
    const conceptToPublishedEmail = this.getResourceConfig(resourceType).conceptToPublishedEmail || {};
    console.log(`Getting resource concept to published email for ${resourceType}:`, conceptToPublishedEmail);
    return conceptToPublishedEmail;
  }

  getFeedbackEmailFrom(resourceType) {
    console.log(`Getting feedback email from for ${resourceType}...`);
    resourceType = resourceType || 'ideas';
    const from = this.getResourceFeedbackEmail(resourceType).from;
    console.log(`Feedback email from for ${resourceType}: ${from}`);
    return from;
  }

  getFeedbackEmailInzendingPath(resourceType) {
    const inzendingPath = this.getResourceFeedbackEmail(resourceType).inzendingPath;
    console.log(`Getting feedback email inzending path for ${resourceType}: ${inzendingPath}`);
    return inzendingPath;
  }

  getResourceFeedbackEmailTemplate(resourceType) {
    const template = this.getResourceFeedbackEmail(resourceType).template;
    console.log(`Getting resource feedback email template for ${resourceType}: ${template}`);
    return template;
  }

  getResourceFeedbackEmailAttachments(resourceType) {
    const attachments = this.getResourceFeedbackEmail(resourceType).attachments;
    console.log(`Getting resource feedback email attachments for ${resourceType}:`, attachments);
    return attachments;
  }

  getResourceFeedbackEmailSubject(resourceType) {
    const subject = this.getResourceFeedbackEmail(resourceType).subject;
    console.log(`Getting resource feedback email subject for ${resourceType}: ${subject}`);
    return subject;
  }

  getMailMethod() {
    const mailMethod = this.config.mail.method;
    console.log(`Getting mail method: ${mailMethod}`);
    return mailMethod;
  }

  getMailTransport() {
    const mailTransport = this.config.mail.transport[this.getMailMethod()];
    console.log(`Getting mail transport:`, mailTransport);
    return mailTransport;
  }

  getNewsletterSignupConfirmationEmailUrl() {
    const confirmationEmailUrl = this.config.newslettersignup.confirmationEmail.url;
    console.log(`Getting newsletter signup confirmation email URL: ${confirmationEmailUrl}`);
    return confirmationEmailUrl;
  }

  getNewsletterSignupConfirmationEmailTemplate() {
    const confirmationEmailTemplate = this.config.newslettersignup.confirmationEmail.template;
    console.log(`Getting newsletter signup confirmation email template: ${confirmationEmailTemplate}`);
    return confirmationEmailTemplate;
  }

  getNewsletterSignupConfirmationEmailAttachments() {
    const attachments = this.config.newslettersignup.confirmationEmail.attachments || this.getDefaultEmailAttachments();
    console.log('Getting newsletter signup confirmation email attachments:', attachments);
    return attachments;
  }

  getNewsletterSignupConfirmationEmailSubject() {
    const subject = this.config.newslettersignup.confirmationEmail.subject;
    console.log(`Getting newsletter signup confirmation email subject: ${subject}`);
    return subject;
  }

  getLogo() {
    let logo = this.config.styling.logo;
    if (process.env.LOGO) {
      logo = process.env.LOGO;
    }
    console.log(`Getting logo: ${logo}`);
    return logo;
  }

  getDefaultEmailAttachments() {
    const logo = this.getLogo();
    const attachments = [];

    // if logo is amsterdam, we fallback to old default logo and include it
    if (logo === 'amsterdam') {
      attachments.push('logo.png');
    }

    if (!logo) {
      attachments.push('openstad-logo.png');
    }
    console.log('Getting default email attachments:', attachments);
    return attachments;
  }
}

module.exports = MailConfig;
