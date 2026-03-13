import './App.css'
import {LoginForm} from "@/components/login-form.tsx";

function App() {
  return (
      <div className="flex min-h-screen w-full items-center justify-center p-4">
        <LoginForm className="w-full max-w-sm" />
      </div>
  )
}

export default App
