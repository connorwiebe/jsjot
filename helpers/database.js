module.exports = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      client: 'pg',
      pool: { min: 1, max: 100 },
       // debug: true,
      connection: { database : 'jsjot' }
    }
  } else {
    return {
      client: 'pg',
      pool: { min: 1, max: 20 }, // heroku free tier limit
      connection: {
        database: 'jsjot',
        user: 'root',
        password: process.env.DATABASE_PASSWORD
      },
      ssl : true
    }
  }
}
