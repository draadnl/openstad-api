var log           = require('debug')('app:cron');
var notifications = require('../notifications');

// Purpose
// -------
// Send notifications emails.
//
// Runs every 5 minutes on the 15th second, because the close_ideas
// cron already runs on the 0th second.
//  - Seconds: 0-59
//  - Minutes: 0-59
//  - Hours: 0-23
//  - Day of Month: 1-31
//  - Months: 0-11
//  - Day of Week: 0-6
module.exports = {
	cronTime: '*/5 * * * * *',
	//cronTime: '20 */5 * * * *',
	runOnInit: false,
	onTick: function() {
		console.log ('running send_idea_notifications', notifications.queue['idea']);
		notifications.processQueue('idea');
	}
};
