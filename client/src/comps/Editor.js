import React from 'react'
import fetch from '../helpers/fetch'
import ls from '../helpers/ls'
import proxy from '../helpers/proxy'
import generateScripts from '../helpers/generate_scripts'
import { ReflexContainer, ReflexSplitter, ReflexElement } from '../helpers/reflex'
import CodeMirror from './CodeMirror'
import Logs from './Logs'

const Editor = React.memo(({ router, user, ws, setLastEditor }) => {

  const [note, setNote] = React.useState(null)
  const [code, setCode] = React.useState(null)

  React.useEffect(() => {
    const id = router.match.params.id

    if (!id) {
      setCode(null)
      setNote(null)
    }

    ws.send(JSON.stringify({ id, type: 'connection' }))

    ;(async () => {
      const note = id ? (await fetch(`/api/note?id=${id}`)) : {}
      setNote(note)
      setLastEditor(note.last_editor)
    })()

    // clean up
    return () => ws.send(JSON.stringify({ type: 'disconnection' }))

  }, [router.match.params.id, setLastEditor, ws])

  const Iframe = () => {
    // console.log('Iframe')
    const onLoad = () => {
      const iframe = document.getElementById('iframe')
      iframe.contentWindow.console = proxy

      const { errScript, utilsScript, codeScript } = generateScripts(code)
      iframe.contentDocument.body.appendChild(errScript)
      iframe.contentDocument.body.appendChild(utilsScript)
      iframe.contentDocument.body.appendChild(codeScript)
    }
    return <iframe onLoad={onLoad} title='sandbox' id='iframe' sandbox='allow-same-origin allow-scripts'></iframe>
  }

  return (
    <ReflexContainer orientation={ls.get('config', 'orientation')}>
      <ReflexElement className='left-pane' onResize={data => ls.set('config', 'splitterPosition', data.component.props.flex)} flex={ls.get('config', 'splitterPosition')}>
        <div className='pane-content'>
          <CodeMirror router={router} user={user} note={note} setCode={setCode} ws={ws} setLastEditor={setLastEditor}/>
        </div>
      </ReflexElement>
      <ReflexSplitter/>
      <ReflexElement className='right-pane'>
        <div className='pane-content'>
          <Logs code={code}/>
          <Iframe/>
        </div>
      </ReflexElement>
    </ReflexContainer>
  )
})

export default Editor
