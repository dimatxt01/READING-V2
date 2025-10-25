import { ServerResetPasswordForm } from '@/components/auth/server-reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enter your email address and we&apos;ll send you a reset link
          </p>
        </div>
        <ServerResetPasswordForm />
      </div>
    </div>
  )
}