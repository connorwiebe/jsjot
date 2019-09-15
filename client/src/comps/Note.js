import React from 'react'
import fetch from '../helpers/fetch'
import ls from '../helpers/ls'
import wsMessage from '../helpers/ws-message'
import RobustWebSocket from 'robust-websocket'
import { ReflexContainer, ReflexSplitter, ReflexElement } from '../helpers/reflex'
import CodeMirror from './CodeMirror'
import Logs from './Logs'
import Iframe from './Iframe'
import List from './List'

const ws = new RobustWebSocket(`${window.location.origin.replace('http','ws').replace('https','wss')}/ws`, undefined, {
  shouldReconnect: (event, ws) => {
    return Math.pow(1.5, ws.attempts) * 500
  }
})

const Note = React.memo(({ router, user }) => {

  const [note, setNote] = React.useState(null)
  const [lastEditor, setLastEditor] = React.useState()
  const [code, setCode] = React.useState(null)
  const [list, setList] = React.useState([])
  const [message, setMessage] = React.useState()

  ws.onmessage = data => setMessage(JSON.parse(data.data))
  ws.onclose = z => wsMessage(ws, { type: 'disconnection', id: router.match.params.id })
  window.onbeforeunload = z => wsMessage(ws, { type: 'disconnection', id: router.match.params.id })

  React.useEffect(() => {
    const id = router.match.params.id

    if (['/notes','/profile'].includes(`/${id}`)) {
      wsMessage(ws, { type: 'disconnection', id })
    }

    if (!id) {
      setCode(null)
      setNote({})
      setLastEditor('')
      setList([])
    }

    if (id) {
      wsMessage(ws, { type: 'connection', id, stayAnonymous: ls.get('config', 'stayAnonymous') })
      ;(async () => {
        const note = await fetch(`/api/note?id=${id}`)
        if (process.env.NODE_ENV === 'development') console.log(note)
        setNote(note)
        setLastEditor(note.last_editor)
      })()
    }

    // clean up
    return () => wsMessage(ws, { type: 'disconnection', id })
  }, [router.match.params.id, user])

  if (note === null) return null
  return (
    <main>
      <List lastEditor={lastEditor} list={list} onClick={() => {
        // do stuff
      }}/>

      <ReflexContainer orientation={ls.get('config', 'orientation')}>
        <ReflexElement className='left-pane' onResize={data => ls.set('config', 'splitterPosition', data.component.props.flex)} flex={ls.get('config', 'splitterPosition')}>
          <div className='pane-content'>
            <CodeMirror router={router} user={user} note={note} setCode={setCode} ws={ws} setLastEditor={setLastEditor} setList={setList} message={message}/>
          </div>
        </ReflexElement>
        <ReflexSplitter/>
        <ReflexElement className='right-pane'>
          <div className='pane-content'>
            <Logs code={code}/>
            <Iframe code={code}/>
          </div>
        </ReflexElement>
      </ReflexContainer>
    </main>
  )
})

export default Note
