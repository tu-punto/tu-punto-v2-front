import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const faviconPath = import.meta.env.VITE_FAVICON_PATH?.trim();
const invalidFaviconPaths = new Set(['', '.', '/']);

if (faviconPath && !invalidFaviconPaths.has(faviconPath)) {
  const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (faviconLink) {
    faviconLink.href = faviconPath;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
