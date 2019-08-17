import React from 'react'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/comment/comment.js'
import 'codemirror/addon/edit/closebrackets.js'
import 'codemirror/keymap/sublime.js'
import 'codemirror/addon/selection/active-line.js'
import { UnControlled as ReactCodeMirror } from 'react-codemirror2'
import ls from '../helpers/ls'
import defer from '../helpers/defer'
import fetch from '../helpers/fetch'

const CodeMirror = React.memo(({ router, user, note, setCode, ws, setLastEditor }) => {
  // console.log('CodeMirror')

  const [instance, setInstance] = React.useState()

  ws.onmessage = data => {
    data = JSON.parse(data.data)

    const { value, selections, identifier } = data

    if (data.type === 'list') {
      return window.alert(`Connected users: ${JSON.stringify(data.list)}`)
    }

    if (data.type === 'value') {
      instance.setValue(value)
      setLastEditor(identifier)
    }

    if (data.type !== 'connection') {
      const syncSelections = ls.get('config', 'syncSelections')
      if (syncSelections) instance.setSelections(selections)
    }
  }

  if (note === null) return null

  return (
    <ReactCodeMirror
      value={note.value}
      cursor={(note.id && note.selections[0].head) || { line: 0, ch: 0 }}
      options={{
        mode: 'javascript',
        theme: ls.get('config', 'theme'),
        lineNumbers: true,
        gutters: [ 'CodeMirror-lint-markers' ],
        autoCloseBrackets: true,
        autofocus: true,
        tabSize: 2,
        scrollbarStyle: 'null',
        keyMap: 'sublime',
        styleActiveLine: { nonEmpty: true },
        lineWrapping: true
      }}
      onChange={(instance, data, value) => {
        const id = router.match.params.id
        if (!data.origin || (data.text[0] === '// ' || data.removed[0] === '// ')) return

        const selections = instance.doc.listSelections()

        if (id && data.origin !== 'setValue') {
          const alias = (ls.get('config', 'stayAnonymous') || !user.username) ? user.alias : user.username
          setLastEditor(alias)
          ws.send(JSON.stringify({
            type: 'value',
            id,
            value,
            selections,
            stayAnonymous: ls.get('config', 'stayAnonymous')
          }))
        }

        defer(async () => {
          if (!id) {
            const { id: newNoteId } = await fetch({
              url: '/api/create',
              body: { value, selections }
            })
            router.history.push(`/${newNoteId}`)
          }
          setCode(value)
        }, 1000)
      }}
      onCursorActivity={instance => {
        const id = router.match.params.id
        if (!id || instance.doc.history.lastSelOrigin !== '*mouse') return
        const selections = instance.doc.listSelections()
        const value = instance.getValue()

        ws.send(JSON.stringify({
          type: 'selection',
          id,
          value,
          selections,
          stayAnonymous: ls.get('config', 'stayAnonymous')
        }))
      }}
      editorDidMount={instance => setInstance(instance)}
    />
  )
})

export default CodeMirror
