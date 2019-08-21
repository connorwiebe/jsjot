import React from 'react'
import proxy from '../helpers/proxy'
import generateScripts from '../helpers/generate_scripts'

const Iframe = React.memo(({ code }) => {

  const RenderIframe = () => {
    const onLoad = () => {
      const iframe = document.getElementById('iframe')
      iframe.contentWindow.console = proxy
      const { errScript, utilsScript, codeScript } = generateScripts(code)
      iframe.contentDocument.body.appendChild(errScript)
      iframe.contentDocument.body.appendChild(utilsScript)
      iframe.contentDocument.body.appendChild(codeScript)
    }
    return <iframe onLoad={onLoad} title='sandbox' id='iframe' sandbox='allow-same-origin allow-scripts'></iframe>
  }

  return <RenderIframe/>
})

export default Iframe
