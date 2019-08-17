import React from 'react'

const LastEditor = ({ lastEditor, onClick }) => {
  if (!lastEditor) return null
  return (
    <div className="last-edit" onClick={onClick}>
      <span>{ lastEditor }</span>
    </div>
  )
}

export default LastEditor
