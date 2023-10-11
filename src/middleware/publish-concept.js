module.exports = function( req, res, next ) {
  const publishAsConcept = req.body.publishAsConcept;

  if (!publishAsConcept) {
    req.body['publishDate'] = new Date();
  } else {
    req.body['publishDate'] = null;
  }
    return next();
}