import './App.css'

import { QueryProvider } from './providers/QueryProvider'
import { ToastProvider } from './components/toast/ToastProvider'
import { TodoPage } from './features/todos/components/TodoPage'

function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <div className="app-shell">
          <TodoPage />
        </div>
      </ToastProvider>
    </QueryProvider>
  )
}

export default App
