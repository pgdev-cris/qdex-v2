import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/login-form'
import { useAuth } from '@/contexts/AuthContext'

export const LoginPage = () => {
    const { token } = useAuth()
    const navigate = useNavigate()

    // Already logged in — go straight to dashboard
    useEffect(() => {
        if (token) {
            navigate('/dashboard', { replace: true })
        }
    }, [token, navigate])

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <LoginForm className="w-full max-w-sm" />
        </div>
    )
}
