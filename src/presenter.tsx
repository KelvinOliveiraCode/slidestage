import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PresenterApp } from './components/PresenterApp'
import './styles/app.css'

/** Entry point da janela do apresentador. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PresenterApp />
  </StrictMode>,
)