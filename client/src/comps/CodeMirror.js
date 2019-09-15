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
import wsMessage from '../helpers/ws-message'

const CodeMirror = React.memo(({ router, user, note, setCode, ws, setLastEditor, setList, message }) => {

  const [instance, setInstance] = React.useState()
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    if (!instance) return
    instance.setSelections(note.selections ? note.selections : { line: 0, ch: 0 })
  }, [instance, note])

  React.useEffect(() => {
    if (!message || !instance) return

    if (message.type === 'established') {
      // hack for session init
      const id = window.location.pathname.slice(1)
      wsMessage(ws, { type: 'connection', id })
    }

    if (message.type === 'list') {
      // sort list alphabetically
      const list = message.list.sort((a, b) => {
        if (b.identifier > a.identifier) return -1
        if (a.identifier < b.identifier) return 1
        return 0
      })
      setList(list)
    }

    if (message.type === 'value') {
      instance.setValue(message.value)
      setLastEditor(message.identifier)
    }

    if (message.type === 'value' || message.type === 'selection') {
      const syncSelections = ls.get('config', 'syncSelections')
      if (syncSelections) instance.setSelections(message.selections)
    }

  }, [message, setList, instance, setLastEditor, ws])

  return (
    <ReactCodeMirror
      value={note.value}
      cursor={{ line: 0, ch: 0 }}
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

        if (id && data.origin !== 'setValue') {
          const identifier = (ls.get('config', 'stayAnonymous') || !user.username) ? user.alias : user.username
          setLastEditor(identifier)

          wsMessage(ws, {
            type: 'value',
            id,
            value,
            selections: instance.doc.listSelections(),
            stayAnonymous: ls.get('config', 'stayAnonymous')
          })
        }

        defer(async () => {
          if (!id && !creating) {
            setCreating(true)
            const { id: newNoteId } = await fetch({
              url: '/api/create',
              body: {
                value,
                lastEditor: (ls.get('config', 'stayAnonymous') || !user.username) ? user.alias : user.username,
                selections: instance.doc.listSelections()
              }
            })
            router.history.push(`/${newNoteId}`)
            setCreating(false)
          }
          setCode(value)
        }, 1000)
      }}
      onCursorActivity={instance => {
        const id = window.location.pathname.slice(1)
        const origin = instance.doc.history.lastSelOrigin
        if (!id || !['*mouse','+move'].includes(origin)) return

        wsMessage(ws, {
          type: 'selection',
          id,
          value: instance.getValue(),
          selections: instance.doc.listSelections(),
          stayAnonymous: ls.get('config', 'stayAnonymous')
        })
      }}
      editorDidMount={instance => setInstance(instance)}
    />
  )
})

export default CodeMirror
