import { redirect } from 'next/navigation'

export default function BuilderSignupPage() {
  redirect('/sign-in?role=builder')
}
