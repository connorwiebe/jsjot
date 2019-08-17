const stringify = require('./stringify')

const proxy = {}

const stringifyArgs = args => {
  const arr = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (typeof arg === 'undefined') {
      arr.push('undefined')
    } else {
      arr.push(stringify(arg))
    }
  }
  return arr
}

const methods = ['debug', 'clear', 'error', 'info', 'log', 'warn', 'dir', 'props', '_raw',
  'group', 'groupEnd', 'dirxml', 'table', 'trace', 'assert', 'count',
  'markTimeline', 'profile', 'profileEnd', 'time', 'timeEnd', 'timeStamp',
  'groupCollapsed']

for (let i = 0; i < methods.length; i++) {
  const method = methods[i]
  proxy[method] = (...args) => {
    args = stringifyArgs(args)
    window.parent.window.postMessage(JSON.stringify({
      console: { method, args }
    }), '*')
  }
}

export default proxy
