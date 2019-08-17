const proxy = require('http-proxy-middleware')

module.exports = app => {
  app.use(proxy('/api', { target: 'http://localhost:2222/' }))
  app.use(proxy('/ws', { target: 'http://localhost:2222/', ws: true }))
};
