const err = require('./err')

module.exports = async (req, res, next) => {

  if (!req.sessionID) {
    return next(err(403, `User doesn't have a session ID.`))
  }

  next()
}
