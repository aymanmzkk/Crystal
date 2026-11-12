import { Suspense, lazy } from 'react'
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppSidebar } from './components/AppSidebar'
import { CommandPalette } from './components/CommandPalette'
import { MobileNav } from './components/MobileNav'
import { Toast } from './components/Toast'
import { useApplyTheme } from './hooks/useApplyTheme'
import { useStorageWatcher } from './hooks/useStorageWatcher'
import { AdminPage } from './pages/AdminPage'
import { DataPage } from './pages/DataPage'
import { Home } from './pages/Home'
import { ModulePage } from './pages/ModulePage'
import { TrashPage } from './pages/TrashPage'
import { useAchievementWatcher } from './modules/achievements/useAchievementWatcher'
import { usePomodoroWatcher } from './modules/pomodoro/usePomodoroWatcher'
import { useReminders } from './reminders/useReminders'

// El gestor de almacenamiento se carga aparte (solo cuando se abre)
const StoragePage = lazy(() => import('./modules/storage/StoragePage'))

function Layout() {
  useApplyTheme()
  useReminders()
  usePomodoroWatcher()
  useAchievementWatcher()
  useStorageWatcher()
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-full">
      {/* Barra lateral fija en ordenador y tableta */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 border-r border-line md:block">
        <AppSidebar />
      </aside>
      {/* Cada página entra con una pequeña transición */}
      <div key={pathname} className="page-in flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
      <MobileNav />
      <Toast />
      <CommandPalette />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'trash', element: <TrashPage /> },
      { path: 'data', element: <DataPage /> },
      { path: 'admin', element: <AdminPage /> },
      {
        path: 'storage',
        element: (
          <Suspense fallback={<div className="skeleton m-4 h-64 md:m-6" />}>
            <StoragePage />
          </Suspense>
        ),
      },
      { path: ':module', element: <ModulePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
