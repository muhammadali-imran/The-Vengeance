"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignInPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

    const validateForm = () => {
        const newErrors: { email?: string; password?: string } = {}

        // Email validation
        if (!email) {
            newErrors.email = "Email is required"
        } else if (!email.endsWith("@nust.edu.pk")) {
            newErrors.email = "Please enter a valid NUST email address (@nust.edu.pk)"
        }

        // Password validation
        if (!password) {
            newErrors.password = "Password is required"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (validateForm()) {
            // Simulate successful login
            console.log("✅ Login successful!")
            // Redirect to feed page
            router.push("/feed")
        }
    }

    return (
        <main className="relative min-h-screen flex items-center justify-center p-4">
            {/* Grid background */}
            <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

            {/* Noise overlay */}
            <div className="noise-overlay" />

            {/* Sign in form */}
            <div className="relative z-10 w-full max-w-md">
                <div className="backdrop-blur-sm bg-card/50 border border-border rounded-lg p-8 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-4xl font-bold tracking-tight mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-muted-foreground">
                            Sign in to your account
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={!!errors.email}
                                className="transition-all duration-200"
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium">
                                    Password
                                </label>
                                <Link
                                    href="#"
                                    className="text-sm text-muted-foreground hover:text-accent transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-invalid={!!errors.password}
                                className="transition-all duration-200"
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            size="lg"
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Sign up link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link
                                href="/sign-up"
                                className="text-accent hover:text-accent/90 font-medium transition-colors underline-offset-4 hover:underline"
                            >
                                Create account
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back to home */}
                <div className="mt-4 text-center">
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Back to home
                    </Link>
                </div>
            </div>
        </main>
    )
}
