import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import 'diff2html/bundles/css/diff2html.min.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:org/:repo/:num" element={<App />} />
        <Route
          path="*"
          element={<div className="placeholder">Open /:org/:repo/:num — e.g. /facebook/react/31000</div>}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
