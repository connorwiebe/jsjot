require('dotenv').config()

const express = require('express')
const app = express()
const expressWs = require('express-ws')(app)
const path = require('path')
const bodyParser = require('body-parser')
const cid = require('crypto-alphanumeric-id')
const favicon = require('serve-favicon')
const haikunator = new (require('haikunator'))()
const compression = require('compression')
const helmet = require('helmet')
const rp = require('request-promise')
const knex = require('knex')(require('./helpers/database')())

const err = require('./helpers/err')
const bouncer = require('./helpers/bouncer')
const sessions = require('./helpers/sessions')
const throttle = require('./helpers/throttle')

app.listen(2222)
const dev = process.env.NODE_ENV === 'development'
const prod = process.env.NODE_ENV === 'production'
if (prod) app.use(compression({ threshold: 0 }))
if (prod) app.use(helmet())
if (prod) app.set('trust proxy', 1)
app.use(bodyParser.json(), bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'client/build')))
app.use(favicon(path.join(__dirname, 'client/build/favicon.ico')))
app.use(sessions(), bouncer)

const client_id = process.env[`GITHUB_ID${prod ? '' : '_DEV'}`]
const client_secret = process.env[`GITHUB_SECRET${prod ? '' : '_DEV'}`]
const redirect_uri = process.env[`GITHUB_CB${prod ? '' : '_DEV'}`]

// ping for closed websocket connections
;(function ping () {
  (() => {
    expressWs.getWss().clients.forEach(client => {
      if (!client.isAlive) {
        return client.terminate()
      }
      client.isAlive = false
      client.ping()
    })
  })()
  setTimeout(ping, 30000)
})()

if (dev) {
  setInterval(() => {
    expressWs.getWss().clients.forEach(client => {
      console.log(`${client.identifier} => ${client.id}`)
    })
  }, 5000)
}

// persist session immediately
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = { alias: haikunator.haikunate({ tokenLength: 0 }) }
    req.session.cookie.maxAge = 2628002880
  }
  next()
})

// =================== API START ===================
app.ws('/ws', (ws, req) => {

  // if (!req.session.user) return next()

  const { username = '', alias = '' } = req.session.user

  // init ws
  ws.sessionID = req.sessionID
  ws.isAlive = true
  ws.on('pong', () => ws.isAlive = true)

  // ws message
  ws.onmessage = async e => {
    const data = JSON.parse(e.data)

    // set identifier
    data.identifier = (data.stayAnonymous || !username) ? alias : username
    ws.identifier = data.identifier

    // associate/disassociate ws connection with note id
    if (data.type === 'connection') return ws.id = data.id
    if (data.type === 'disconnection') return ws.id = undefined

    // broadcast selections and value changes to all users with on the same note
    if (data.type === 'selection' || data.type === 'value') {
      expressWs.getWss().clients.forEach(client => {
        if (client.sessionID !== req.sessionID && client.id === data.id) {
          client.send(JSON.stringify(data))
        }
      })
      throttle.save(data, req.sessionID)
    }

    // get list of all users connected to a note
    if (data.type === 'list') {
      let list = []
      expressWs.getWss().clients.forEach(client => {
        if (client.id === data.id) {
          list.push(client.identifier)
        }
      })
      ws.send(JSON.stringify({type: 'list', list}))
    }

  }
})

app.get('/api/user', async (req, res, next) => {
  res.json(req.session.user)
})

app.get('/api/note', async (req, res, next) => {
  const { id } = req.query
  if (!id) return res.json({})
  const note = await knex('notes').where({ id }).first() || {}
  res.json(note)
})

app.get('/login', async (req, res, next) => {
  if (req.session.user.username) return res.redirect('http://localhost:3000/')

  const state = await cid(5)
  res.redirect(302,`https://github.com/login/oauth/authorize?client_id=${client_id}&state=${state}&redirect_uri=${redirect_uri}`)
})

app.get('/login/callback', async (req, res, next) => {
  const { code, state } = req.query
  if (!code) return next(err(400,'No code in login callback.'))

  const { access_token } = await rp({
    method: 'post',
    uri: 'https://github.com/login/oauth/access_token',
    qs: { client_id, client_secret, code, redirect_uri, state },
    json: true
  })

  const gitUser = await rp({
    method: 'get',
    uri: 'https://api.github.com/user',
    headers: { 'User-Agent': 'connorwiebe' },
    qs: { access_token },
    json: true
  })
  if (dev) console.log(gitUser)

  const username = gitUser.login
  const user = await knex('users').where({ username }).first()
  if (!user) await knex('users').insert({ username, access_token })

  req.session.user.username = username
  req.session.cookie.maxAge = 2628002880
  req.session.save(() => res.redirect(dev ? 'http://localhost:3000/' : 'https://jsjot.com/'))
})

app.post('/api/create', async (req, res, next) => {
  const { username = null } = req.session
  let { value, selections } = req.body

  let id
  const idLength = 5
  for (let i = 0; i < 999; i++) {
    id = await cid(idLength)
    if (id.length !== idLength) continue
    try {
      await knex('notes').insert({
        id,
        value,
        author: username,
        last_editor: username,
        selections: JSON.stringify(selections)
      })
      break
    } catch (err) {
      if (i === 999) return next(err(500, 'Failed to insert note.'))
      if (err.code === '23505') continue
      return next(err)
    }
  }

  res.send({ id })
})

app.get('/api/signOut', async (req, res, next) => {
  if (!req.session.user.username) return next(err(401,'Client tried to access a users only route.'))
  req.session.destroy(() => res.end())
})

app.get('/api/notes', async (req, res, next) => {
  const notes = await knex('notes').where({ author: req.session.user.username })
  res.send(notes)
})
// =================== API END ===================

// serve index from build folder
app.get('*', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'))
})

// error handling
app.use((req, res, next) => {
  next({ code: 404 })
})

app.use(async (err, req, res, next) => {
  if (dev) console.log(err)
  if (err.statusCode) err.code = err.statusCode
  if (!err.code || typeof err.code !== 'number') err.code = 500
  if (err.code === 500 && prod) process.exitCode = 1
  res.status(err.code)
  if (dev) console.log('sending error status:', err.code)
  res.send({ err: err.message })
})
