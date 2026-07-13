import { Home, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '@/hooks/useT'

export function NotFoundPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  return (
    <div className="section-wrapper min-h-[70vh] flex items-center justify-center">
      <div className="glass-card rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full">
        <p className="text-6xl font-display text-primary mb-4">404</p>
        <h1 className="font-display text-2xl mb-3">
          {isAr ? 'هذه الصفحة غير موجودة' : 'This page does not exist'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {isAr
            ? 'ربما تغيّر الرابط أو تمت كتابة العنوان بشكل غير صحيح.'
            : 'The link may have changed, or the address may have been typed incorrectly.'}
        </p>
        <Link to="/" className="btn-teal inline-flex px-5 py-2.5">
          {isAr ? <ArrowLeft className="w-4 h-4 rtl-flip" /> : <Home className="w-4 h-4" />}
          {isAr ? 'العودة للرئيسية' : 'Back to dashboard'}
        </Link>
      </div>
    </div>
  )
}
