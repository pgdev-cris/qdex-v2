import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GalleryVerticalEnd } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const { login, loading } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        try {
            await login(username, password)
            navigate('/dashboard', { replace: true })
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : 'Login failed. Please try again.'
            setError(message)
        }
    }

    return (
        <div className={cn('flex flex-col gap-4', className)} {...props}>
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
                            <GalleryVerticalEnd className="size-5" />
                        </div>
                        <h1 className="text-xl font-bold">Welcome to Qdex</h1>
                        <FieldDescription>Sign in to your account to continue.</FieldDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="username">Username</FieldLabel>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter username..."
                                    required
                                    value={username}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setUsername(e.target.value)
                                    }
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter password..."
                                    required
                                    value={password}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setPassword(e.target.value)
                                    }
                                />
                            </Field>

                            {error && <FieldError>{error}</FieldError>}

                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Signing in…' : 'Sign in'}
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>

                <CardFooter>
                    <FieldDescription className="text-center">
                        By logging in, you acknowledge that this is a company system intended for
                        authorized users only. All activities may be logged and monitored.
                    </FieldDescription>
                </CardFooter>
            </Card>
        </div>
    )
}
