module.exports = function( req, res, next ) {
  const publishAsConcept = req.body.publishAsConcept;

  console.log( 'publishAsConcept START' );
  console.log( JSON.stringify( req.body ) );
  console.log( publishAsConcept );
  console.log( 'publishAsConcept END' );

  if(publishAsConcept === undefined || publishAsConcept === null) {
    return next();
  } else if (!publishAsConcept) {
    req.body['publishDate'] = new Date();
  } else {
    req.body['publishDate'] = null;
  }
    return next();
}