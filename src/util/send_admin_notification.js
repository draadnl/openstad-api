const config = require('config');
const db = require('../db'); // looped required
const mail = require('../lib/mail');

let self = this;

const args = process.argv;

if (args.length <= 2) {
  console.log ('Please give idea ID as argument'); process.exit();
}

const ideaId = process.argv[2];
const type = 'idea';
const action = 'create';

db.Idea.findByPk(ideaId)
  .then(idea => {
    if (!idea) {
      console.log ('Idea not found'); process.exit();
    }
    
    db.Site.findByPk(idea.siteId)
  .then(site => {
    
    //const data = { type: 'idea', action: 'create', siteId: idea.siteId, instanceId: idea.id };
    
    const instanceId = idea.id;
    const data = [{instanceId}];

    let myConfig = Object.assign({}, config, site && site.config);

    let maildata = {};

    maildata.subject = type == 'argument' ? 'Nieuwe argumenten geplaatst' : ( action == 'create' ? 'Nieuwe inzending geplaatst' : 'Bestaande inzending bewerkt' );

    maildata.from = ( myConfig.notifications && ( myConfig.notifications.from || ( myConfig.notifications.admin && myConfig.notifications.admin.emailAddress ) ) ) || myConfig.mail.from; // backwards compatible
    maildata.to = ( myConfig.notifications && myConfig.notifications.to ) || maildata.from;

    maildata.EMAIL = maildata.from;
    maildata.HOSTNAME = ( myConfig.cms && ( myConfig.cms.hostname || myConfig.cms.domain ) ) || myConfig.hostname || myConfig.domain;
    maildata.URL = ( myConfig.cms && myConfig.cms.url ) || myConfig.url || ( 'https://' + maildata.HOSTNAME );
    maildata.SITENAME = ( site && site.title ) || myConfig.siteName;

    maildata.subject += ' op ' + maildata.SITENAME;

    maildata.template = myConfig.notifications && myConfig.notifications.template;

    let instanceIds = data.map( entry => entry.instanceId );
    let model = type.charAt(0).toUpperCase() + type.slice(1);

    let scope = type == 'idea' ? ['withUser'] : ['withUser', 'withIdea'];
    db[model].scope(scope).findAll({ where: { id: instanceIds }})
      .then( found => {
        maildata.data = {};
        maildata.data[type] = found.map( entry => {
          let json = entry.toJSON();
          if ( type == 'idea' ) {
            let inzendingPath = ( myConfig.ideas && myConfig.ideas.feedbackEmail && myConfig.ideas.feedbackEmail.inzendingPath && myConfig.ideas.feedbackEmail.inzendingPath.replace(/\[\[ideaId\]\]/, entry.id) ) || "/";
            json.inzendingURL = maildata.URL + inzendingPath;
          }
          return json;
        });
        mail.sendNotificationMail(maildata);
        
        console.log ('Mail sent for', maildata.data.idea[0].id, maildata.data.idea[0].title);
        process.exit;
      });

  })
  })

