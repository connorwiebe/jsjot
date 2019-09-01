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
const isBot = require('isbot-fast')
const expressIp = require('express-ip')

const err = require('./helpers/err')
const sessions = require('./helpers/sessions')
const throttle = require('./helpers/throttle')

app.listen(2222)
const dev = process.env.NODE_ENV === 'development'
const prod = process.env.NODE_ENV === 'production'
app.use(bodyParser.json(), bodyParser.urlencoded({ extended: false }))
app.use(sessions())

const client_id = process.env[`GITHUB_ID${prod ? '' : '_DEV'}`]
const client_secret = process.env[`GITHUB_SECRET${prod ? '' : '_DEV'}`]
const redirect_uri = process.env[`GITHUB_CB${prod ? '' : '_DEV'}`]

if (prod) {
  app.use(compression({ threshold: 0 }))
  app.use(helmet())
  app.set('trust proxy', 1)
  app.use(express.static(path.join(__dirname, 'client/build')))
  app.use(favicon(path.join(__dirname, 'client/build/favicon.ico')))
}

// delete notes without any value once a day
;(function cleanup () {
  (async () => {
    await knex('notes').where('value', '').del()
	})()
  setTimeout(cleanup, 86400000)
})()

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

/* =================== API START =================== */
app.ws('/ws', (ws, req) => {

  // hack. have to do this when session is first created or ws connection has different session
  if (!req.session.user) return ws.terminate()

  // init ws
  ws.send(JSON.stringify({ type: 'established' }))
  ws.sessionID = req.sessionID
  ws.isAlive = true
  ws.on('pong', () => ws.isAlive = true)

  // send close event to users associated with same note
  ws.onclose = e => {
    const socket = e.target
    sendList(socket.id)
  }

  // ws message
  ws.onmessage = async e => {

    const { username, alias, country, ll, ip } = req.session.user || {}
    const data = JSON.parse(e.data)

    if (dev) console.log(`message -> ${data.type}`)

    // set identifier and country
    data.identifier = (data.stayAnonymous || !username) ? alias : username
    ws.identifier = data.identifier
    ws.country = country
    ws.ll = ll
    ws.ip = ip

    // associate/disassociate ws connection with note id
    if (data.type === 'connection') {
      ws.id = data.id
      sendList(data.id)
    }
    if (data.type === 'disconnection') {
      ws.id = undefined
      sendList(data.id)
    }

    // broadcast selections and value changes to all users on the same note
    if (data.type === 'selection' || data.type === 'value') {
      expressWs.getWss().clients.forEach(client => {
        if (client.sessionID !== req.sessionID && client.id === data.id) {
          client.send(JSON.stringify(data))
        }
      })
      // save change to db
      throttle.save(data, req.sessionID)
    }
  }

  const sendList = id => {
    // get list of all users connected to note
    let list = []
    expressWs.getWss().clients.forEach(client => {
      if (!client.id || !id) return
      if (client.id === id) {
        list.push({ identifier: client.identifier, country: client.country })
      }
    })
    // send list to all users connected to note
    expressWs.getWss().clients.forEach(client => {
      if (!client.id || !id) return
      if (client.id === id) {
        client.send(JSON.stringify({ type: 'list', list }))
      }
    })
  }

})

if (false && dev) {
  setInterval(() => {
    const list = [`\n------------------------------------------------`]
    expressWs.getWss().clients.forEach(client => {
      list.unshift(`\n${client.identifier} -> ${client.id || null} | ${client.sessionID}`)
    })
    console.log(`Total clients: ${expressWs.getWss().clients.size} ${list}`)
  }, 5000)
}

app.get('/api/sockets', (req, res, next) => {
  const { key } = req.query
  if (key !== process.env.CONNORWIEBE_KEY) return next(err(403,'Incorrect key.'))

  const users = []
  expressWs.getWss().clients.forEach(client => {
    const [lat, long] = client.ll || []
    users.push({ username: client.identifier, lat, long })
  })

  res.json(users)
})

app.get('/api/user', (req, res, next) => {
  const ip = dev ? '64.233.191.255' : (req.headers['x-forwarded-for'].split(',')[0] || req.ip)

  // create user object for new user
  if (!req.session.user && !isBot(req.headers['user-agent'])) {
    const userMetadata = expressIp().getIpInfo(ip)
    req.session.user = {
      alias: haikunator.haikunate({ tokenLength: 0 }),
      country: userMetadata.country,
      ll: userMetadata.ll,
      ip
    }
    req.session.cookie.maxAge = 2628002880
  }

  // update ip and meta info if user's ip changed
  if (req.session.user && req.session.user.ip !== ip) {
    const userMetadata = expressIp().getIpInfo(ip)
    req.session.user = {
      ...req.session.user,
      country: userMetadata.country,
      ll: userMetadata.ll,
      ip
    }
  }

  res.json(req.session.user)
})

app.get('/api/note', async (req, res, next) => {
  const { id } = req.query
  if (!id) return res.json({})
  const note = await knex('notes').select('id','value','selections','last_editor').where({ id }).first() || {}
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
  req.session.cookie.maxAge = 2628002880 // 1 month
  req.session.save(() => res.redirect(dev ? 'http://localhost:3000/' : 'https://jsjot.com/'))
})

app.post('/api/create', async (req, res, next) => {
  const { username = null } = req.session.user
  let { value, selections, lastEditor } = req.body

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
        last_editor: username || lastEditor,
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

app.put('/api/signOut', async (req, res, next) => {
  if (!req.session.user && req.session.user.username) return next(err(401,'Client tried to access a users only route.'))
  req.session.destroy(() => res.end())
})

app.get('/api/notes', async (req, res, next) => {
  const notes = await knex('notes').where({ author: req.session.user.username })
  res.send(notes)
})
/* =================== API END =================== */

// serve index from build folder
if (prod) {
  app.get('*', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'))
  })
}

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
  res.send({ err: err.message })
})
