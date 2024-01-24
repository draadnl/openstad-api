module.exports = function (req, res, next) {
  const publishAsConcept = req.body.publishAsConcept;

  if (publishAsConcept === undefined || publishAsConcept === null) {
    return next();
  } else if (publishAsConcept === '0') {
    req.body['publishDate'] = new Date();
  } else if (publishAsConcept === '1') {
    req.body['publishDate'] = null;
  }

  return next();
};