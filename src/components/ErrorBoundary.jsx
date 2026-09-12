import { Component } from 'react'

/**
 * شبكة أمان عامة: أي خطأ غير متوقع في أي مكان بالتطبيق (بدل أن يُجمّد الشاشة
 * أو يُظهر شاشة بيضاء) يعرض رسالة عربية بسيطة مع زر لإعادة التحميل.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ستوكلي] خطأ غير متوقع:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="page page-narrow center" style={{ paddingTop: '20vh' }}>
        <div className="empty">
          <div className="empty-icon">😕</div>
          <h3>حدث خطأ غير متوقع</h3>
          <p className="muted">حاول إعادة تحميل الصفحة. إن تكررت المشكلة، تواصل مع الدعم.</p>
          <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
            إعادة التحميل
          </button>
        </div>
      </div>
    )
  }
}
