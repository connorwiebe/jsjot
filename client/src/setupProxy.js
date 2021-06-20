const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = app => {
  app.use(createProxyMiddleware('/api', { target: 'http://localhost:2222/' }))
  app.use(createProxyMiddleware('/ws', { target: 'http://localhost:2222/', ws: true }))
};
