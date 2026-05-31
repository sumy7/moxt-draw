import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// App.tsx will be created in Task 8; temporarily import the jsx version
// @ts-ignore
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
