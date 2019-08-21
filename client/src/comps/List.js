import React from 'react'
import classNames from 'classnames'

const List = React.memo(({ lastEditor, list, onClick }) => {
  return (
    <div className="list" onClick={onClick}>
      <div className="connections">
        { list.length ? list.map((connection, i) => {
          return (
            <div key={i} className={ classNames("connection", { "last-editor": lastEditor === connection.identifier }) }>
              <img className="flag" alt={connection.country} src={`https://www.countryflags.io/${connection.country || 'aq'}/flat/16.png`}/>
              <div className="identifier">{ connection.identifier }</div>
            </div>
          )
        }) : null }

      </div>
    </div>
  )
})

export default List
