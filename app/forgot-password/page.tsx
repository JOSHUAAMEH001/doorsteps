import { ForgotPasswordForm } from "@/components/screens/forgot-password-form"

type ForgotPasswordPageProps = {
  searchParams: Promise<{ email?: string | string[] }>
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { email } = await searchParams
  const initialEmail = typeof email === "string" ? email : ""

  return <ForgotPasswordForm initialEmail={initialEmail} />
}
