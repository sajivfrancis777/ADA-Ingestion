import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ModuleRegistry, ClientSideRowModelModule, CommunityFeaturesModule, CsvExportModule } from 'ag-grid-community'
import App from './App'
import './App.css'

// Register AG Grid Community modules
ModuleRegistry.registerModules([ClientSideRowModelModule, CommunityFeaturesModule, CsvExportModule])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
