import { Component, type ReactNode } from 'react'
import { exportData } from '../features/backup/backup-operations'

type Props = { children: ReactNode }
type State = { error: Error | null; exported: 'idle' | 'working' | 'done' | 'failed' }

/**
 * Catches render-time crashes anywhere below it so a single thrown error
 * shows a recovery screen instead of a blank white app. The fallback also
 * offers a data export, so a crash can never trap the user's prayers — the
 * backup JSON is decrypted and re-importable on a fresh install.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, exported: 'idle' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Keep a breadcrumb for debugging device-only crashes.
    console.error('[PrayerCycles] Render crash:', error, info)
  }

  handleExport = async () => {
    this.setState({ exported: 'working' })
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prayercycles-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      this.setState({ exported: 'done' })
    } catch {
      this.setState({ exported: 'failed' })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    const { exported } = this.state

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-base px-6 text-text">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-text-secondary">
            The app hit an unexpected error. Your prayers are still saved on this
            device — you can download a backup below before reloading, just to be safe.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <button
            onClick={this.handleExport}
            disabled={exported === 'working'}
            className="w-full rounded-lg bg-input-hover py-2.5 text-sm font-medium text-text transition-colors hover:bg-input cursor-pointer disabled:opacity-40"
          >
            {exported === 'working' ? 'Preparing…'
              : exported === 'done' ? 'Backup downloaded ✓'
              : exported === 'failed' ? 'Export failed — try reload'
              : 'Download my data'}
          </button>
          <button
            onClick={this.handleReload}
            className="w-full rounded-lg bg-accent/15 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent/25 cursor-pointer"
          >
            Reload app
          </button>
        </div>

        <details className="max-w-sm text-xs text-text-muted">
          <summary className="cursor-pointer select-none">Technical details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-left">
            {this.state.error.name}: {this.state.error.message}
          </pre>
        </details>
      </div>
    )
  }
}
