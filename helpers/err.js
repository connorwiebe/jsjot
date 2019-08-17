// throw errors with call stack
module.exports = (code, msg) => {
  const err = new Error(msg)
  err.code = code
  return err
}
