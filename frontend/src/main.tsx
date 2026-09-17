import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

if (window.location.hostname.endsWith('.app.github.dev')) {
  const NativeWebSocket = window.WebSocket
  window.WebSocket = new Proxy(NativeWebSocket, {
    construct(Target, args) {
      const [url, protocols] = args as [string | URL, string | string[] | undefined]
      const originalUrl = String(url)
      const nextUrl = originalUrl.endsWith(':8000/ws')
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
        : originalUrl

      return protocols === undefined
        ? new Target(nextUrl)
        : new Target(nextUrl, protocols)
    },
  }) as typeof WebSocket
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
