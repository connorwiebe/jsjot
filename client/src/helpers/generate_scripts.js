const generateScripts = code => {

  const targetOrigin = process.env.NODE_ENV === 'development' ? '*' : 'https://jsjot.com'

  // error script
  const errScript = document.createElement('script')
  errScript.text = `window.onerror = (msg, src, ln, col, err) => {
    window.parent.postMessage(JSON.stringify({ console: { method: 'error', ln, msg, src, ln, col, err, args: [err.stack] } }), '${targetOrigin}');
  };`

  // utilities script
  const utilsScript = document.createElement('script')
  utilsScript.text = `let log = console.log.bind(console);
  let print = console.log.bind(console);
  window.onerror = (msg, src, ln, col, err) => {
    window.parent.postMessage(JSON.stringify({ console: { method: 'error', ln, msg, src, ln, col, err, args: [err.stack] } }), '${targetOrigin}');
  };
  window.onunhandledrejection = e => {
    window.parent.postMessage(JSON.stringify({ console: { method:'error', type: 'unhandledrejection', args: [e.reason.stack]}}), '${targetOrigin}');
  };`

  // code script
  const codeScript = document.createElement('script')
  codeScript.text = code

  return { errScript, utilsScript, codeScript }

}

export default generateScripts
