import React from 'react'
import classNames from 'classnames'

import ls from '../helpers/ls'
import fetch from '../helpers/fetch'

const Profile = ({ router, user, setTheme }) => {
  // console.log('Profile')
  const [loading, setLoading] = React.useState({ signOut: false })
  const [config, setConfig] = React.useState(ls.get('config'))

  if (!user.username) return router.history.push('/')
  return (
    <div className="component-wrapper" onClick={e => {
      const key = e.target.getAttribute('config-key')
      let value = e.target.getAttribute('config-value')
      try { value = JSON.parse(value) } catch (err) {}
      if (!key) return
      ls.set('config', key, value)
      setConfig(ls.get('config'))
      if (key === 'theme') setTheme(value)
    }}>

      <div className="titles">
        <h2>Profile</h2>
      </div>

      {/* theme. */}
      <div className="opt">
        <div className="opt-title">Theme.</div>
        <div className="opt-action">
          <button config-key="theme" config-value="default" className={ classNames("no-btn", { active: config.theme === 'default' }) }>Default</button>
          <button config-key="theme" config-value="monochrome" className={ classNames("no-btn", { active: config.theme === 'monochrome' }) }>Monochrome</button>
          <button config-key="theme" config-value="monochrome-dark" className={ classNames("no-btn", { active: config.theme === 'monochrome-dark' }) }>Monochrome Dark</button>
          <button config-key="theme" config-value="ocean-dark" className={ classNames("no-btn", { active: config.theme === 'ocean-dark' }) }>Ocean Dark</button>
        </div>
      </div>

      {/* auto run.
      <div className="opt auto-run">
        <div className="opt-title">Automatically execute your code.</div>
        <input type="checkbox"/>
      </div> */}

      {/* orientation */}
      <div className="opt">
        <div className="opt-title">Console Orientation.</div>
          <div className="opt-action">
            <button config-key="orientation" config-value="vertical" className={ classNames("no-btn", { active: config.orientation === 'vertical' }) }>Vertical</button>
            <button config-key="orientation" config-value="horizontal" className={ classNames("no-btn", { active: config.orientation === 'horizontal' }) }>Horizontal</button>
          </div>
      </div>

      {/* sync cursor */}
      <div className="opt">
        <div className="opt-title">Sync Cursors.</div>
          <div className="opt-action">
            <button config-key="syncSelections" config-value="true" className={ classNames("no-btn", { active: config.syncSelections }) }>True</button>
            <button config-key="syncSelections" config-value="false" className={ classNames("no-btn", { active: !config.syncSelections }) }>False</button>
          </div>
      </div>

      {/* stay anonymous */}
      <div className="opt">
        <div className="opt-title">Stay Anonymous.</div>
          <div className="opt-action">
            <button config-key="stayAnonymous" config-value="true" className={ classNames("no-btn", { active: config.stayAnonymous }) }>True</button>
            <button config-key="stayAnonymous" config-value="false" className={ classNames("no-btn", { active: !config.stayAnonymous }) }>False</button>
          </div>
      </div>

      {/* preserve logs */}
      <div className="opt">
        <div className="opt-title">Preserve Logs.</div>
          <div className="opt-action">
            <button config-key="preserveLogs" config-value="true" className={ classNames("no-btn", { active: config.preserveLogs }) }>True</button>
            <button config-key="preserveLogs" config-value="false" className={ classNames("no-btn", { active: !config.preserveLogs }) }>False</button>
          </div>
      </div>

      {/*sign out*/}
      <div className="opt">
        <div className="opt-title">Sign out of your account.</div>
        <div className="opt-action">
          <button onClick={async e => {
            setLoading({ ...loading, signOut: true })
            await fetch({ method: 'put', url: '/api/signOut' })
            setTimeout(() => {
              setLoading({ ...loading, signOut: false })
              window.location = window.location.origin
            }, 30000)
          }} className={ classNames("btn", { loading: loading.signOut })}>Sign Out</button>
        </div>
      </div>

    </div>
  )
}

export default Profile
