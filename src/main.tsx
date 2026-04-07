import { Component, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CopilotKit } from '@copilotkit/react-core'
import '@copilotkit/react-ui/styles.css'
import './index.css'
import App from './App.tsx'

// Error Boundary: prevents CopilotKit crashes from going white-screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#b91c1c' }}>
          <strong>App error:</strong> {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

const runtimeUrl = import.meta.env.VITE_COPILOT_RUNTIME_URL ?? '/api/copilotkit'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CopilotKit runtimeUrl={runtimeUrl}>
        <App />
      </CopilotKit>
    </ErrorBoundary>
  </StrictMode>,
)
