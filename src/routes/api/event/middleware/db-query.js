const createError = require('http-errors');
const { Op, fn } = require('sequelize');
const moment = require('moment');
const Joi = require('joi');
const _ = require('lodash');
const log = require('debug')('app:event-middleware/db-query');

const db = require('../../../../db');
const schemas = require('../schemas');

module.exports = async function (req, res, next) {
  try {
    // TODO: Fix this parsing
    if (req.query.tagIds) {
      if (Array.isArray(req.query.tagIds)) {
        req.query.tagIds = req.query.tagIds.map(tags => JSON.parse(tags))
      } else {
        req.query.tagIds = JSON.parse(req.query.tagIds)
      }
    }
    req.query = await schemas.queryEvents.validateAsync(req.query);

    // @todo: implement pagination without offset: https://use-the-index-luke.com/sql/partial-results/fetch-next-page
    const query = {
      where: {
        siteId: req.params.siteId,
      },
      include: [db.Organisation, db.Tag],
      subQuery: false,
      // Disabled limit for now because it remove results
      // limit: 60,
      // logging: console.log,
      // offset: (req.query.page - 1) * 60,
      order: [
        [{ model: db.EventTimeslot, as: 'slots' }, 'startTime', 'ASC'],
        ['name', 'ASC'],
      ],
    };

    if (req.query.organisationId) {
      query.where.organisationId = req.query.organisationId;
    }

    if (req.query.q) {
      query.where[Op.or] = [
        { name: { [Op.like]: `%${req.query.q}%` } },
        { description: { [Op.like]: `%${req.query.q}%` } },
      ];
    }

    if (req.query.districts) {
      query.where.district = {
        [Op.or]: [].concat(req.query.districts),
      };
    }

    if (req.query.tagIds) {
      // Add an extra join which can be used to filter. This will still fetch all associated tags.
      query.include.push({ model: db.Tag, as: 'filterTags' });

      // Use 'or' query to filter on multiple groups of tags
      if (Array.isArray(req.query.tagIds[0])) {
        const and = req.query.tagIds.map((tags) => ({
            '$filterTags.id$': [].concat(tags),
          })
        );

        if (query.where[Op.or]) {
          query.where[Op.or].push(and);
        } else {
          query.where[Op.or] = and;
        }
      } else {
        // For a simple array of tag ids and backwards compat
        query.where['$filterTags.id$'] = [].concat(req.query.tagIds);
      }
    }

    if (req.query.dates) {
      const dates = [].concat(req.query.dates).map((date) => {
        const between = [
          moment(date).startOf('day').toDate(),
          moment(date).endOf('day').toDate(),
        ];

        return {
          startTime: {
            [Op.between]: between,
          },
          endTime: {
            [Op.between]: between,
          },
        };
      });

      query.include.push({
        model: db.EventTimeslot,
        as: 'slots',
        required: true,
        where: {
          [Op.or]: dates,
        },
      });
    } else {
      // Only include events that are in the future
      const include = {
        model: db.EventTimeslot,
        as: 'slots',
        required: true,
        where: {
          startTime: {
            [Op.gte]: moment().startOf('day').toDate(),
          },
        },
      };

      // If you filter on organisation and you are part of the organisation then also fetch events from the past, this allows you to edit events from the past.
      if (
        req.query.organisationId &&
        req.user.organisationId === req.query.organisationId
      ) {
        delete include.where;
      }
      query.include.push(include);
    }

    res.locals.query = query;

    return next();
  } catch (err) {
    if (Joi.isError(err)) {
      const errorDetails = err.details.map((e) => e.message).join(', ');
      log(`${err.message}: %O`);
      return next(createError(400, errorDetails));
    }

    log(`${err.message}: %O`);
    next(err);
  }
};
