const Promise = require('bluebird');
const express = require('express');
const db      = require('../../db');
const auth    = require('../../auth');
const mail = require('../../lib/mail');
const moment = require('moment-timezone');

let router = express.Router({mergeParams: true});

router.route('/:formId([a-zA-Z0-9\-\_]*)/count')
	.get(function (req, res, next) {
		let formId = req.params.formId.replace('/', ''),
		where = { formId };
		
		req.scope = ['defaultScope'];
		//req.scope.push({method: ['forSiteId', req.params.siteId]});

		db.Submission
			.scope(...req.scope)
			.findAll({ where })
			.then( found => {
				found.filter(function (submission) {
					return submission.siteId == req.params.siteId;
				})
				return found.length;
			})
			.then(function( found ) {
				res.json({count: found});
			})
			.catch(next);
	});

router.route('/:formId([a-zA-Z0-9\-\_]*)')
// list submissions
// --------------
	.get(auth.can('submissions:list'))
	.get(function(req, res, next) {
		let formId = req.params.formId.replace('/', ''),
		where = { formId };
		
		req.scope = ['defaultScope'];
	//	req.scope.push({method: ['forSiteId', req.params.siteId]});

		db.Submission
			.scope(...req.scope)
			.findAll({ where })
			.then( found => {
				return found.map( entry => {
					let data = entry.toJSON();
					let submittedData = data.submittedData,
						orderedData = {};
					
					// When we get the submittedData back from MySQL, the keys are in the wrong order.
					// We inserted a number in front of the key before inserting the data, so now we can sort on that
					Object.keys(submittedData).sort(function (a, b) {
						let keyA = a.split(':')[0],
						keyB = b.split(':')[0];
						
						if (keyA < keyB) {
							return -1;
						} else if (keyA > keyB) {
							return 1;
						}
						
						return 0;
					}).forEach(function (key) {
						var newKey = key.split(':');
						orderedData[newKey.length > 1 ? newKey[1] : newKey[0]] = submittedData[key];
					});
					
					data.submittedData = orderedData;
					data.createdAt = moment(data.createdAt).format('LLL');
					return data;
				});
			})
			.then(function( found ) {
				res.json(found);
			})
			.catch(next);
	});

router.route('/')

// list submissions
// --------------
	.get(auth.can('submissions:list'))
	.get(function(req, res, next) {
		let where = {};
		req.scope = ['defaultScope'];
	//	req.scope.push({method: ['forSiteId', req.params.siteId]});

		db.Submission
			.scope(...req.scope)
			.findAll({ where })
			.then( found => {
				return found.map( entry => entry.toJSON() );
			})
			.then(function( found ) {
				res.json(found);
			})
			.catch(next);
	})

// create submission
// ---------------
  .post(auth.can('submissions:create'))
	.post(function (req, res, next) {
		const blocklist = [
			"usmannasir2726@gmail.com",
			"lecyberzilla1@wearehackerone.com"
		];
		
		if (req.body.submittedData) {
			let proceed         = true;
			const submittedData = Object.values(req.body.submittedData);
			
			// There are no forms with more than 50 fields
			if (submittedData.length > 50) {
				req.body.sendMail = false;
				return next();
			}
			
			// Check for blocklist emails in submitted data
			submittedData.some(function (data) {
				return blocklist.some(function (email) {
					if (data.indexOf(email) > -1) {
						req.body.sendMail = false;
						return true;
					}
					
					return false;
				});
			});
			
		}
		
		return next();
	})
	.post(function(req, res, next) {
		let data = {
			submittedData     : req.body.submittedData,
			siteId      			: req.params.siteId,
			userId      			: req.user.id,
			formId						: req.body.formId,
			ideaId						: parseInt(req.body.ideaId) || null,
		};
		
		db.Submission
			.create(data)
			.then(async result => {
				res.json(result);

				if(req.body.sendMail === '1') {
					if(req.body.shouldSendEmailToIdeaUser && data.ideaId) {
						const idea = await db.Idea.scope('includeUser').findOne({where: {id: data.ideaId}});

            mail.sendSubmissionConfirmationMail(result, req.body.userEmailTemplate, req.body.emailSubject, req.body.submittedData, req.body.titles, req.site, idea.user.email, req.body.recipient, idea);
					}

					if (req.body.emailTemplate) {
						mail.sendSubmissionConfirmationMail(result, req.body.emailTemplate, req.body.emailSubject, req.body.submittedData, req.body.titles, req.site, req.body.recipient);
					}
					
					if (data.ideaId) {
						const idea = await db.Idea.scope('includeUser').findOne({where: {id: data.ideaId}});
						mail.sendSubmissionAdminMail(result, req.body.emailAdminTemplate || 'submission_admin', req.body.emailSubjectAdmin, req.body.submittedData, req.body.titles, req.site, idea);
					} else {
						mail.sendSubmissionAdminMail(result, req.body.emailAdminTemplate || 'submission_admin', req.body.emailSubjectAdmin, req.body.submittedData, req.body.titles, req.site);
					}
					
				}
			})
	})

	// with one existing submission
	// --------------------------
	router.route('/:submissionId(\\d+)')
		.all(function(req, res, next) {
			var submissionId = parseInt(req.params.submissionId);

			req.scope = ['defaultScope'];
			req.scope.push({method: ['forSiteId', req.params.siteId]});

		//	let where = { siteId }


			db.Submission
				.scope(...req.scope)
		//		.find({ where })
        .find()
				.then(found => {
					if ( !found ) throw new Error('Submission not found');
					req.submission = found;
					next();
				})
				.catch(next);
		})

	// view submission
	// -------------
		.get(auth.can('submissions:view'))
		.get(function(req, res, next) {
			res.json(req.submission);
		})

	// update submission
	// ---------------
		.put(auth.can('submissions:edit'))
		.put(function(req, res, next) {
			req.submission
				.update(req.body)
				.then(result => {
					res.json(result);
				})
				.catch(next);
		})

	// delete submission
	// ---------------
		.delete(auth.can('submissions:delete'))
		.delete(function(req, res, next) {
			req.submission
				.destroy()
				.then(() => {
					res.json({ "submission": "deleted" });
				})
				.catch(next);
		})

module.exports = router;
