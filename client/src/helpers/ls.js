const ls = {}

ls.get = function (name, key) {
  let store = JSON.parse(localStorage.getItem(name))
  if (!store) {
    store = defaults[name]
    localStorage.setItem(name, JSON.stringify(store))
  }
  if (arguments.length !== 2) return store
  return store[key]
}

ls.set = function (name, key, value) {
  let store = JSON.parse(localStorage.getItem(name)) || defaults[name]
  store[key] = value
  localStorage.setItem(name, JSON.stringify(store))
}

const defaults = {
  config: {
    theme: 'monochrome',
    splitterPosition: 0.65,
    display: 'large',
    autoRun: true,
    preserveLogs: false,
    syncSelections: true,
    stayAnonymous: false,
    orientation: 'vertical'
  }
}


export default ls
