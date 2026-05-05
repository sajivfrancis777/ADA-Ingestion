import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ModuleRegistry, ClientSideRowModelModule, CommunityFeaturesModule, CsvExportModule } from 'ag-grid-community'
import App from './App'
import './App.css'
import { loadPlatformCache } from './utils/platformLookup'

// Register AG Grid Community modules
ModuleRegistry.registerModules([ClientSideRowModelModule, CommunityFeaturesModule, CsvExportModule])

// Pre-load IAPM platform cache for grid auto-fill (fire-and-forget)
loadPlatformCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
