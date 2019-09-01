const knex = require('knex')(require('../helpers/database')())

module.exports = (() => {

  // Map of notes [id, setTimeoutId]
  const list = new Map()

  const createSetTimeout = (id, data) => {

    const saveObj = {
      value: data.value,
      last_edit: 'now()'
    }

    if (data.type === 'value') {
      saveObj.last_editor = data.identifier
    }

    if (data.selections) {
      saveObj.selections = JSON.stringify(data.selections)
    }

    return setTimeout(async () => {
      if (process.env.NODE_ENV === 'development') console.log(`updating db with data -> ${JSON.stringify(data)}`)
      await knex('notes').where({ id }).update(saveObj)
      list.delete(id)
    }, 5000)
  }

  return {

    save: (data, sessionID) => {
      const { id } = data

      // check if note already has a running setTimeout
      if (list.has(id)) {

        // get the note's setTimeoutId
        let { setTimeoutId } = list.get(id)

        // clear the current setTimeout
        clearTimeout(setTimeoutId)

        // create a new setTimeout for the note
        setTimeoutId = createSetTimeout(id, data)

        // update the Map with the new setTimeoutId
        list.set(id, {
          setTimeoutId,
          sessionID
        })

        return
      }

      // create new setTimeout for the note
      const setTimeoutId = createSetTimeout(id, data)

      // set the note and setTimeoutId in the Map
      list.set(id, {
        setTimeoutId,
        sessionID
      })

    }
  }

})()
