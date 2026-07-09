import { Toolbar } from './components/Toolbar'
import { PageList } from './components/PageList'
import { EditorStage } from './components/EditorStage'
import { PropertiesPanel } from './components/PropertiesPanel'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF編集アプリ</h1>
      </header>
      <Toolbar />
      <div className="app-body">
        <aside className="app-sidebar-left">
          <PageList />
        </aside>
        <main className="app-main">
          <EditorStage />
        </main>
        <aside className="app-sidebar-right">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  )
}

export default App
