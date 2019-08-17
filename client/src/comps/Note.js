import React from 'react'
import RobustWebSocket from 'robust-websocket'
import LastEditor from './LastEditor'
import Editor from './Editor'

const ws = new RobustWebSocket(`${window.location.origin.replace('http','ws').replace('https','wss')}/ws`, undefined, {
  shouldReconnect: (event, ws) => {
    return Math.pow(1.5, ws.attempts) * 500
  }
})

const Note = ({ router, user }) => {
  // console.log('Note')

  const [lastEditor, setLastEditor] = React.useState()

  return (
    <main>
      <LastEditor lastEditor={lastEditor} onClick={() => {
        const id = router.match.params.id
        ws.send(JSON.stringify({ id, type: 'list' }))
      }}/>

      <Editor router={router} user={user} ws={ws} setLastEditor={setLastEditor}/>
    </main>
  )
}

export default Note
