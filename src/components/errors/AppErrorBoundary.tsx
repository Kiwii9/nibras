import { Component, type ErrorInfo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

function clean(value: string | null | undefined, maxLength: number) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .slice(0, maxLength)
}

async function reportClientError(error: Error, info: ErrorInfo) {
  try {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return

    const { data: rateData, error: rateError } = await supabase.rpc('consume_rate_limit', { p_scope: 'client_error' })
    if (rateError || !rateData?.allowed) return

    await supabase.from('client_error_logs').insert({
      user_id: userId,
      message: clean(error.message || error.name || 'Unknown client error', 1000),
      stack: clean(`${error.stack || ''}\n${info.componentStack || ''}`, 8000) || null,
      route: clean(`${window.location.pathname}${window.location.search}`, 500) || null,
      user_agent: clean(navigator.userAgent, 1000) || null,
      metadata: {
        online: navigator.onLine,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        release: '2026-07-13-v1',
      },
    })
  } catch (reportingError) {
    console.warn('Nibras error reporting failed', reportingError)
  }
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nibras application error', error, info.componentStack)
    void reportClientError(error, info)
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
            تم حفظ تقرير تقني آمن عند توفر جلسة تسجيل دخول. حدّث الصفحة للمتابعة.
            <br />
            A sanitized diagnostic was recorded when a signed-in session was available. Reload to continue.
          </p>
          <button onClick={this.reload} className="btn-teal px-6 py-2.5">
            تحديث الصفحة · Reload
          </button>
        </section>
      </main>
    )
  }
}
