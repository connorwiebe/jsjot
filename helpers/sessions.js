const expressSession = require('express-session')
const sessionStore = require('connect-session-knex')(expressSession)
const knex = require('knex')(require('../helpers/database')())
const prod = process.env.NODE_ENV === 'production'

module.exports = () => {
  const store = new sessionStore({ knex, clearInterval: 90000 })
  return expressSession({
    secret: process.env.SESSION_SECRET,
    proxy: prod,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 86400, // 1 day
      secure: prod
    },
    store
  })
}
