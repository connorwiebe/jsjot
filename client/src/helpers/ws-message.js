export default (ws, msg) => {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg))
  }
}
