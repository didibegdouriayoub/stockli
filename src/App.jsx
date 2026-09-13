import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider } from './lib/AuthContext'
import { StoreProvider } from './lib/StoreContext'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import PublicOnly from './components/PublicOnly'
import AppShell from './components/AppShell'
import LoadingScreen from './components/LoadingScreen'
import ConfigMissingPage from './pages/ConfigMissingPage'

// كل صفحة تُحمَّل فقط عند زيارتها فعلياً (تقسيم الحزمة حسب الصفحة) بدل تحميل
// كل شاشات التطبيق دفعة واحدة عند أول فتح — أهم لأصحاب محلات ببيانات محدودة.
const AuthPage = lazy(() => import('./pages/AuthPage'))
const SellPage = lazy(() => import('./pages/SellPage'))
const StockPage = lazy(() => import('./pages/StockPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'))
const AdminStoresPage = lazy(() => import('./pages/AdminStoresPage'))

export default function App() {
  if (!isSupabaseConfigured) return <ConfigMissingPage />

  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route
                path="/auth"
                element={
                  <PublicOnly>
                    <AuthPage />
                  </PublicOnly>
                }
              />

              <Route
                path="/stock/new"
                element={
                  <RequireAuth>
                    <ProductFormPage />
                  </RequireAuth>
                }
              />

              <Route
                path="/stock/:id/edit"
                element={
                  <RequireAuth>
                    <ProductFormPage />
                  </RequireAuth>
                }
              />

              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<SellPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <RequireAdmin>
                      <AdminStoresPage />
                    </RequireAdmin>
                  </RequireAuth>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
