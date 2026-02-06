"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export default function OTPVerificationPage() {
    const router = useRouter()
    const [otp, setOtp] = useState("")
    const [error, setError] = useState("")

    const handleComplete = (value: string) => {
        setOtp(value)
        setError("")
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (otp.length !== 6) {
            setError("Please enter the complete 6-digit code")
            return
        }

        // TODO: Verify OTP with backend
        console.log("Verifying OTP:", otp)

        // For now, just show success or redirect to dashboard
        // You can redirect to dashboard or show success message
        // router.push("/dashboard")
    }

    const handleResend = () => {
        // TODO: Resend OTP logic
        console.log("Resending OTP...")
        setOtp("")
        setError("")
    }

    return (
        <main className="relative min-h-screen flex items-center justify-center p-4">
            {/* Grid background */}
            <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

            {/* Noise overlay */}
            <div className="noise-overlay" />

            {/* OTP verification form */}
            <div className="relative z-10 w-full max-w-md">
                <div className="backdrop-blur-sm bg-card/50 border border-border rounded-lg p-8 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-4xl font-bold tracking-tight mb-2">
                            Verify Your Email
                        </h1>
                        <p className="text-muted-foreground">
                            We've sent a 6-digit code to your email
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* OTP Input */}
                        <div className="space-y-2">
                            <label htmlFor="otp" className="text-sm font-medium block text-center">
                                Enter verification code
                            </label>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={(value) => handleComplete(value)}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            {error && (
                                <p className="text-sm text-destructive text-center animate-in fade-in slide-in-from-top-1 duration-200">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            size="lg"
                        >
                            Verify Code
                        </Button>
                    </form>

                    {/* Resend code */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the code?{" "}
                            <button
                                type="button"
                                onClick={handleResend}
                                className="text-accent hover:text-accent/90 font-medium transition-colors underline-offset-4 hover:underline"
                            >
                                Resend code
                            </button>
                        </p>
                    </div>
                </div>

                {/* Back to sign up */}
                <div className="mt-4 text-center">
                    <Link
                        href="/sign-up"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Back to sign up
                    </Link>
                </div>
            </div>
        </main>
    )
}
