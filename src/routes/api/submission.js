const express = require('express');
const db      = require('../../db');
const mail = require('../../lib/mail');
const auth = require('../../middleware/sequelize-authorization-middleware');
const pagination = require('../../middleware/pagination');
const searchResults = require('../../middleware/search-results-static');
const merge = require("merge");
const config = require("config");

let router = express.Router({mergeParams: true});

router.route('/')

// list submissions
// --------------
	.get(auth.can('Submission', 'list'))
	.get(pagination.init)
	.get(function (req, res, next) {
		let where = {};
		req.scope = ['defaultScope'];

		if (req.query.filter || req.query.exclude) {
			req.scope.push({method: ['filter', JSON.parse(req.query.filter), req.query.exclude]});
		}

		db.Submission
			.scope(...req.scope)
			.findAndCountAll({where, offset: req.dbQuery.offset, limit: req.dbQuery.limit, order: req.dbQuery.order})
			.then(function (result) {
				req.results       = result.rows;
				req.dbQuery.count = result.count;
				return next();
			})
			.catch(next);
	})
	.get(auth.useReqUser)
	.get(searchResults)
	.get(pagination.paginateResults)
	.get(function(req, res, next) {
		res.json(req.results);
  })

// create submission
// ---------------
  .post(auth.can('Submission', 'create'))
	.post(function(req, res, next) {
		const data = {
			submittedData     : req.body.submittedData,
			siteId      			: req.params.siteId,
			userId      			: req.body.userId,
			formId					: req.body.formId,
			formName					: req.body.formName,
			ideaId					: parseInt(req.body.ideaId) || null,
		};

		if (req.body.formName) {
			data.formName = req.body.formName
		}

		db.Submission
			.authorizeData(data, 'create', req.user)
			.create(data)
			.then(async result => {
				res.json(result);

				if(req.body.sendMail === '1') {
					if (req.body.shouldSendEmailToIdeaUser && data.ideaId) {
						//const idea = await db.Idea.scope('includeUser').findOne({ideaId: data.ideaId});
						// let idea = null;

						let user = null;

						if (data.ideaId) {
							// await db.Idea.scope('includeUser').findByPk(data.ideaId)
							// 	.then( foundIdea => {
							// 		if (!foundIdea) console.error('Idea niet gevonden')
							// 		idea = foundIdea;
							// 	})
                            //     .catch( err => {
							// 		console.error(err);
							// 	})

							let where = {
								id: data.userId,
								siteId: data.siteId,
							};

							await db.User.findOne({ where }).then( foundUser => {
									if (!foundUser) console.error('User niet gevonden')
									user = foundUser;
								});


						console.log( JSON.stringify(user) );
						console.log( JSON.stringify(req.body) );

                        if ( !!idea ) {
                            mail.sendSubmissionConfirmationMail(result, req.body.emailTemplate, req.body.emailSubject, req.body.submittedData, req.body.titles, req.site, idea.user.email, req.body.recipient);
                        }
                    }

					mail.sendSubmissionAdminMail(result, req.body.emailAdminTemplate || 'submission_admin', req.body.emailSubjectAdmin, req.body.submittedData, req.body.titles, req.site);
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
				.findOne({
				    where: {id: submissionId, siteId: req.params.siteId}
				})
				.then(found => {
					if ( !found ) throw new Error('Submission not found');
					req.results = found;
					next();
				})
				.catch(next);
		})

// view submission
// -------------
	.get(auth.can('Submission', 'view'))
	.get(auth.useReqUser)
	.get(function(req, res, next) {
		res.json(req.results);
	})

	// update submission
	// ---------------
	.put(auth.useReqUser)
		.put(function(req, res, next) {
		  var submission = req.results;
      if (!( submission && submission.can && submission.can('update') )) return next( new Error('You cannot update this submission') );
		  submission
				.update(req.body)
				.then(result => {
					res.json(result);
				})
				.catch(next);
		})

// delete submission
// ---------------
	.delete(auth.can('Submission', 'delete'))
	.delete(function(req, res, next) {
		req.results
			.destroy()
			.then(() => {
				res.json({ "submission": "deleted" });
			})
			.catch(next);
	})

module.exports = router;
