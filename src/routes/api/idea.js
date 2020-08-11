const Promise = require('bluebird');
const Sequelize = require('sequelize');
const express = require('express');
const moment			= require('moment');
const createError = require('http-errors')
const config = require('config');
const db = require('../../db');
const auth = require('../../auth');
const mail = require('../../lib/mail');

let router = express.Router({mergeParams: true});

// scopes: for all get requests
router
	.all('*', function(req, res, next) {

		req.scope = ['api'];


		req.scope.push('selectVisibleIdeas');
		var sort = (req.query.sort || '').replace(/[^a-z_]+/i, '') || ( req.cookies['idea_sort'] && req.cookies['idea_sort'].replace(/[^a-z_]+/i, '') );
		if( sort ) {
			res.cookie('idea_sort', sort, { expires: 0 });
			if (sort == 'votes_desc' || sort == 'votes_asc') {
				req.scope.push('includeVoteCount'); // het werkt niet als je dat in de sort scope functie doet...
			}
			req.scope.push({ method: ['sort', req.query.sort]});
		}

		if (req.query.mapMarkers) {
			req.scope.push('mapMarkers');
		}

		if (req.query.running) {
			req.scope.push('selectRunning');
		}

		if (req.query.includeArguments) {
			req.scope.push({ method: ['includeArguments', req.user.id]});
		}

		if (req.query.includeMeeting) {
			req.scope.push('includeMeeting');
		}

		if (req.query.includePosterImage) {
			req.scope.push('includePosterImage');
		}

		if (req.query.includeUser) {
			req.scope.push('includeUser');
		}

		if (req.query.includeVoteCount && req.site && req.site.config && req.site.config.votes && req.site.config.votes.isViewable) {
			req.scope.push('includeVoteCount');
		}

		if (req.query.includeUserVote && req.site && req.site.config && req.site.config.votes && req.site.config.votes.isViewable) {
			// ik denk dat je daar niet het hele object wilt?
			req.scope.push({ method: ['includeUserVote', req.user.id]});
		}

		// todo? volgens mij wordt dit niet meer gebruikt
		// if (req.query.highlighted) {
		//  	query = db.Idea.getHighlighted({ siteId: req.params.siteId })
		// }

		return next();

	})

router.route('/')

// list ideas
// ----------
	.get(auth.can('ideas:list'))
	.get(function(req, res, next) {
		db.Idea
			.scope(...req.scope)
			.findAll({ where: { siteId: req.params.siteId } })
			.then( found => {
				return found.map( entry => {
					return createIdeaJSON(entry, req.user);
				});
			})
			.then(function( found ) {
				res.json(found);
			})
			.catch(next);
	})

// create idea
// -----------
	.post(auth.can('idea:create'))
	.post(function(req, res, next) {
		if (!req.site) return next(createError(401, 'Site niet gevonden'));
		return next();
	})
	.post(function( req, res, next ) {
		if (!(req.site.config && req.site.config.ideas && req.site.config.ideas.canAddNewIdeas)) return next(createError(401, 'Inzenden is gesloten'));
		return next();
	})
	.post(function(req, res, next) {
		filterBody(req);
		req.body.siteId = parseInt(req.params.siteId);
		req.body.userId = req.user.id;
		req.body.startDate = new Date();

		try {
			req.body.location = JSON.parse(req.body.location || null);
		} catch(err) {}

		db.Idea
			.create(req.body)
			.then(result => {
				res.json(createIdeaJSON(result, req.user));
				if (result.status && result.status != 'DRAFT') {
					mail.sendThankYouMail(result, req.user, req.site) // todo: optional met config?
				}
			})
			.catch(function( error ) {
				// todo: dit komt uit de oude routes; maak het generieker
				if( typeof error == 'object' && error instanceof Sequelize.ValidationError ) {
					let errors = [];
					error.errors.forEach(function( error ) {
						// notNull kent geen custom messages in deze versie van sequelize; zie https://github.com/sequelize/sequelize/issues/1500
						// TODO: we zitten op een nieuwe versie van seq; vermoedelijk kan dit nu wel
						errors.push(error.type === 'notNull Violation' && error.path === 'location' ? 'Kies een locatie op de kaart' : error.message);
					});
					res.status(422).json(errors);
				} else {
					next(error);
				}
			});
	})

// user idea list
// --------
router.route('/user')
  .all(function(req, res, next) {

    console.log('get ideas for user: ', req.user.id);
    db.Idea
      .scope(...req.scope, 'includeVoteCount', 'includeDraftIdeas')
      .findAll({
        where: { userId: parseInt(req.user.id), siteId: req.params.siteId }
      })
      .then(found => {
        return found.map( entry => {
          return createIdeaJSON(entry, req.user);
        });
      })
      .then(function( found ) {
        res.json(found);
      })
      .catch(next);
  })

// one idea
// --------
router.route('/:ideaId(\\d+)')
	.all(function(req, res, next) {
		var ideaId = parseInt(req.params.ideaId) || 1;

		db.Idea
			.scope(...req.scope, 'includeVoteCount')
			.findOne({
				where: { id: ideaId, siteId: req.params.siteId }
			})
			.then(found => {
				if ( !found ) throw new Error('Idea not found');
				req.idea = found;
				next();
			})
			.catch(next);
	})

// view idea
// ---------
	.get(auth.can('idea:view'))
	.get(function(req, res, next) {
		res.json(createIdeaJSON(req.idea, req.user));
	})

// update idea
// -----------
	.put(auth.can('idea:edit'))
	.put(function(req, res, next) {
		filterBody(req)
		if (req.body.location) {
			try {
				req.body.location = JSON.parse(req.body.location || null);
			} catch(err) {}
		} else {
			if (!req.body.modBreak) {
				req.body.location = JSON.parse(null);
			}
		}

		req.idea
			.update(req.body)
			.then(result => {
				res.json(createIdeaJSON(result, req.user));
			})
			.catch(next);
	})

// delete idea
// ---------
	.delete(auth.can('idea:delete'))
	.delete(function(req, res, next) {
		req.idea
			.destroy()
			.then(() => {
				res.json({ "idea": "deleted" });
			})
			.catch(next);
	})

// single user idea
// todo: refactor this logic
// --------
router.route('/:ideaId(\\d+)/user')
	.all(function(req, res, next) {
		var ideaId = parseInt(req.params.ideaId) || 1;

		db.Idea
			.scope(...req.scope, 'includeVoteCount', 'includeDraftIdeas')
			.findOne({
				where: { id: ideaId, userId: parseInt(req.user.id), siteId: req.params.siteId }
			})
			.then(found => {
				if ( !found ) throw new Error('Idea not found');
				req.idea = found;
				next();
			})
			.catch(next);
	})


// view idea
// ---------
	.get(auth.can('idea:view'))
	.get(function(req, res, next) {
		res.json(createIdeaJSON(req.idea, req.user));
	})

// update idea
// -----------
	.put(auth.can('idea:edit'))
	.put(function(req, res, next) {
		filterBody(req)
		
		let sendMail = false;
		
		// Send thank you email to user when changing from draft to open
		if (req.idea.status && req.body.status && req.idea.status == 'DRAFT' && req.body.status == 'OPEN') {
			sendMail = true;
		}
		
		if (req.body.location) {
			try {
				req.body.location = JSON.parse(req.body.location || null);
			} catch(err) {}
		} else {
			if (!req.body.modBreak) {
				req.body.location = JSON.parse(null);
			}
		}

		req.idea
			.update(req.body)
			.then(result => {
				
				if (sendMail) {
					mail.sendThankYouMail(result, req.user, req.site)
				}
				
				res.json(createIdeaJSON(result, req.user));
			})
			.catch(next);
	})

// delete idea
// ---------
	.delete(auth.can('idea:delete'))
	.delete(function(req, res, next) {
		req.idea
			.destroy()
			.then(() => {
				res.json({ "idea": "deleted" });
			})
			.catch(next);
	})

// extra functions
// ---------------

function filterBody(req) {
	let filteredBody = {};

	let keys;
	if (req.user.isAdmin()) {
		keys = [ 'siteId', 'meetingId', 'userId', 'startDate', 'endDate', 'sort', 'status', 'title', 'posterImageUrl', 'summary', 'description', 'budget', 'extraData', 'location', 'modBreak', 'modBreakUserId', 'modBreakDate' ];
	} else {
		keys = [ 'title', 'summary', 'description', 'extraData', 'location', 'budget', 'status'];
	}

	keys.forEach((key) => {
		if (req.body[key] || key === 'description') {
			filteredBody[key] = req.body[key];
		}
	});

	if (req.user.isAdmin()) {
    if (filteredBody.modBreak) {
      if ( !req.idea || req.idea.modBreak != filteredBody.modBreak ) {
        if (!req.body.modBreakUserId) filteredBody.modBreakUserId = req.user.id;
        if (!req.body.modBreakDate) filteredBody.modBreakDate = new Date().toString();
      }
    } else {
      filteredBody.modBreak = '';
      filteredBody.modBreakUserId = null;
      filteredBody.modBreakDate = null;
    }
  }

	req.body = filteredBody;
}

function createIdeaJSON(idea, user) {

	let can = {
		// edit: user.can('arg:edit', argument.idea, argument),
		// delete: req.user.can('arg:delete', entry.idea, entry),
		// reply: req.user.can('arg:reply', entry.idea, entry),
	};

	let result = idea.toJSON();
	result.config = null;
	result.site = null;
	result.can = can;


// Fixme: hide email in arguments and their reactions
	function hideEmailsForNormalUsers(args) {
		return args.map((argument) => {
			argument.user.email = user.role === 'admin' ? argument.user.email : '';

			if (argument.reactions) {
				argument.reactions = argument.reactions.map((reaction) => {
					reaction.user.email = user.role === 'admin' ? reaction.user.email : '';

					return reaction;
				})
			}

			return argument;
		});
	}

	if (idea.argumentsAgainst) {
		result.argumentsAgainst = hideEmailsForNormalUsers(result.argumentsAgainst);
	}

	if (idea.argumentsFor) {
		result.argumentsFor = hideEmailsForNormalUsers(result.argumentsFor);
	}

	if (idea.extraData && idea.extraData.phone && user.role !== "admin") {
		delete result.extraData.phone;
	}

	if (idea.user) {
		result.user = {
			firstName: idea.user.firstName,
			lastName: idea.user.lastName,
			fullName: idea.user.fullName,
			nickName: idea.user.nickName,
			isAdmin: user.role == 'admin',
			gender: idea.user.gender ? idea.user.gender : 'unknown',
			email: user.role == 'admin' ? idea.user.email : '',
		};
	} else {
		result.user = {
			isAdmin: user.role == 'admin',
		};
	}
	result.createdAtText = moment(idea.createdAt).format('LLL');

	return result;

}

module.exports = router;
