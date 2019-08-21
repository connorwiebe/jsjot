import React from 'react'
import ReactDOM from 'react-dom'
import fetch from './helpers/fetch'
import ls from './helpers/ls'
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom'
import Note from './comps/Note'
import Notes from './comps/Notes'
import Profile from './comps/Profile'
import './sass.sass'

const Nav = ({ username }) => {
  return (
    <nav>
      <h1 className="title">
        <Link to="/">JSJot</Link>
      </h1>
      <div className="items">
        { username && <Link className="item" to="/notes">Notes</Link> }
        { username && <Link className="item" to="/profile">{username}</Link> }
        { !username && <a className="item" href={`${process.env.NODE_ENV === 'development' ? 'http://localhost:2222' : window.location.origin}/login`}>Login</a> }
      </div>
    </nav>
  )
}

const App = () => {

  const [user, setUser] = React.useState({ username: null })
  const [theme, setTheme] = React.useState()

  React.useEffect(() => {
    ;(async () => {
      var user = await fetch('/api/user')
      if (process.env.NODE_ENV === 'development') console.log(user)
      setUser(user)
    })()
    setTheme(ls.get('config', 'theme'))
  }, [])

  const Routes = () => {
    return (
      <Switch>
        <Route exact path='/' render={router => <Note router={router} user={user}/>} />
        <Route exact path='/notes' render={router => <Notes router={router} user={user}/>} />
        <Route exact path='/profile' render={router => <Profile router={router} user={user} setTheme={setTheme}/>} />
        <Route path='/:id' render={router => <Note router={router} user={user}/>} />
      </Switch>
    )
  }

  if (user.username === null) return null
  return (
    <div className='wrapper' data-theme={theme}>
      <Nav username={user.username}/>
      <Routes/>
    </div>
  )
}

const root = document.getElementById('root')
ReactDOM.render(<Router><App/></Router>, root)
