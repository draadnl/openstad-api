const Promise = require('bluebird');
const express = require('express');
const db      = require('../../db');
const auth    = require('../../auth');
const mail = require('../../lib/mail');

let router = express.Router({mergeParams: true});

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
