import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nibras application error', error, info.componentStack)
  }

  private reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6" dir="auto">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg,#1A4D53,#3E9AA6)' }}>
            ن
          </div>
          <h1 className="font-display text-2xl mb-3">حدث خطأ غير متوقع · Something went wrong</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            لم يتم فقدان حسابك. حدّث الصفحة للمتابعة. إذا تكرر الخطأ، أرسل تقريراً مع الخطوات التي أدت إليه.
            <br />
            Your account is safe. Reload the page to continue. If it repeats, report the steps that caused it.
          </p>
          <button onClick={this.reload} className="btn-teal px-6 py-2.5">
            تحديث الصفحة · Reload
          </button>
        </section>
      </main>
    )
  }
}
