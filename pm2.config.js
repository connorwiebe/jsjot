module.exports = {
  apps : [{
    name: 'jsjot',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
  }]
}
