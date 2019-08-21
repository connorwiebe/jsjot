import React from 'react'
import fetch from '../helpers/fetch'
import ls from '../helpers/ls'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import { Link } from 'react-router-dom'
import qs from 'querystringify'
import chunk from 'lodash.chunk'

const Notes = ({ router }) => {

  const [{ notes = null, pages = [], page = 1 }, setNote] = React.useState({})
  const [display, setDisplay] = React.useState(ls.get('config', 'display'))

  React.useEffect(() => {
    ;(async () => {
      let _notes = await fetch('/api/notes')
      if (process.env.NODE_ENV === 'development') console.log(_notes)
      _notes = _notes.map(({ last_edit, ...rest }) => ({ last_edit: +new Date(last_edit), ...rest }))
      _notes.sort((a, b) => b.last_edit - a.last_edit)
      setNote({ notes: _notes, pages: chunk(_notes, 10), page: qs.parse(router.location.search).page - 1 || 0 })
    })()
  }, [router.location.search])

  return (
    <div className="component-wrapper">
      <div className="titles">
        <div className="notes-title">
          <h2>Notes</h2>
          <div className="note-options">
            <div className="display-options">
              <button onClick={e => {
                const type = e.currentTarget.firstChild.getAttribute('data-display')
                if (!type) return
                ls.set('config', 'display', type)
                setDisplay(type)
              }}>
                <svg data-display="large" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M4 18h17v-5H4v5zM4 5v5h17V5H4z"/>
                  <path fill="none" d="M0 0h24v24H0V0z"/>
                </svg>
              </button>
              <button onClick={e => {
                const type = e.currentTarget.firstChild.getAttribute('data-display')
                if (!type) return
                ls.set('config', 'display', type)
                setDisplay(type)
              }}>
                <svg data-display="small" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M4 5h17v3H4zM4 10h17v3H4zM4 15h17v3H4z"/>
                  <path fill="none" d="M0 0h24v24H0V0z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

        { notes && !notes.length && <div className="no-notes">You have no notes.</div> }

        <div className="notes" data-display={display}>
          { pages.length ? pages[page].map((note, i) => {
            return (
              <Link key={i} to={`/${note.id}`}>
                <div className="note" data-display={display}>
                  <CodeMirror value={note.value} options={{
                    mode: 'javascript',
                    theme: ls.get('config','theme'),
                    lineNumbers: true,
                    readOnly: 'nocursor',
                    scrollbarStyle: 'null'
                  }} />
                </div>
              </Link>
            )
          }) : null }
        </div>


      <div className="pages">
        { Array.from({ length: pages.length }, (v, i) => {
          return (
            <Link
              to={`/notes?page=${i+1}`}
              onClick={e => {
                const page = e.target.text - 1
                setNote({ notes, pages, page })
              }}
              className="page"
              data-active={i === +page}
              key={i}>{i+1}
            </Link>
          )
        }) }
      </div>
    </div>
  )
}

export default Notes
