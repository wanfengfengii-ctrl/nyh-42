import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import App from './App'
import './index.css'

const theme = createTheme({
  primaryColor: 'copper',
  colors: {
    copper: [
      '#fef3ec',
      '#fddccc',
      '#f5b899',
      '#ed935e',
      '#e67a36',
      '#d4753c',
      '#c4632e',
      '#a94f24',
      '#8e411e',
      '#723418',
    ],
    steel: [
      '#e8f1f5',
      '#cde0e8',
      '#97bfcf',
      '#5f9cb5',
      '#4a90a4',
      '#3d7d90',
      '#336779',
      '#295262',
      '#1f3d4c',
      '#142836',
    ],
    dark: [
      '#f0f1f3',
      '#d7d9de',
      '#a3a8b4',
      '#6f778a',
      '#3d4560',
      '#2a3050',
      '#1e2338',
      '#1a1f2e',
      '#141824',
      '#0d1018',
    ],
  },
  fontFamily: "'Roboto Mono', monospace",
  headings: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: '700',
  },
  defaultRadius: 'xs',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>,
)
