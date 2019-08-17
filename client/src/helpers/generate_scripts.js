const generateScripts = code => {

  // error script
  const errScript = document.createElement('script')
  errScript.text = `window.onerror = (msg, src, ln, col, err) => {
    window.parent.postMessage(JSON.stringify({ console: { method: 'error', ln, msg, src, ln, col, err, args: [err.stack] } }), '*');
  };`

  // utilities script
  const utilsScript = document.createElement('script')
  utilsScript.text = `let log = console.log.bind(console);
  let print = console.log.bind(console);
  window.onerror = (msg, src, ln, col, err) => {
    window.parent.postMessage(JSON.stringify({ console: { method: 'error', ln, msg, src, ln, col, err, args: [err.stack] } }), '*');
  };
  window.onunhandledrejection = e => {
    window.parent.postMessage(JSON.stringify({ console: { method:'error', type: 'unhandledrejection', args: [e.reason.stack]}}), '*');
  };`

  // code script
  const codeScript = document.createElement('script')
  codeScript.text = code

  return { errScript, utilsScript, codeScript }

}

export default generateScripts
