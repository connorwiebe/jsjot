import React from 'react'
import { ReflexContainer, ReflexSplitter, ReflexElement } from '../helpers/reflex'
import ls from '../helpers/ls'

const Logs = React.memo(({ code }) => {
  // console.log('Logs')
  const [logs, setLogs] = React.useState([])

  React.useEffect(() => {
    const preserveLogs = ls.get('config', 'preserveLogs')
    if (!preserveLogs) setLogs([[]])
    if (preserveLogs && code !== undefined) {
      setLogs(oldLogs => [...oldLogs, []])
    }
  }, [code])

  window.onmessage = e => {
    let data
    try { data = JSON.parse(e.data) } catch (err) { return }
    if (!data.console.args.length) return

    let { method, type, args, ...errHandlerArgs } = data.console
    let { ln, msg, err } = errHandlerArgs

    // print console output and stack traces to console
    if (method === 'log' || (err && !msg.includes('ReferenceError') && !msg.includes('SyntaxError'))) {
      console[method].apply(console, args)
    }

    // format error message
    if (type === 'unhandledrejection') {
      const formatError = stack => {

        const stackArr = stack.split('\n')
        const errType = stackArr[0]
        const lNArr = stackArr[1]
        let lN = ''

        let lNFlag = false
        for (let i = 0; i < lNArr.length; i++) {
          const char = lNArr.charAt(i)
          if (char === ':') lNFlag = lNFlag ? false : true
          if (char !== ':' && lNFlag) lN = lN + char
        }

        return [`Line ${lN}: Uncaught ${errType}`]
      }
      args = [formatError(args[0])]
    }
    if (err) args = [`Line ${ln}: ${msg}`]

    // push new logs to latest log array
    setLogs(oldLogs => {
      oldLogs[oldLogs.length-1].push(...args)
      return [...oldLogs]
    })
  }

  const logRef = React.useRef()
  React.useEffect(e => {
    if (logRef.current) {
      logRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const logEls = () => {
    return logs.map((batch, i) => {
      if (!batch.length) return null
      return (
        <React.Fragment key={i}>
          <ReflexElement className='right-pane'>
            <div className='pane-content'>
              { batch.map((log, i) => <div className='log' ref={logRef} key={i}>{log}</div>) }
            </div>
          </ReflexElement>
          { (i+1 !== logs.length) && <ReflexSplitter/> }
        </React.Fragment>
      )
    })
  }

  if (code === null) return null
  return (
    <div className='logs'>
      <ReflexContainer orientation='horizontal'>
        { logEls() }
      </ReflexContainer>
    </div>
  )
})

export default Logs
