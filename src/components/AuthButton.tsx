import { useGoogleLogin } from '@react-oauth/google'
import { Button } from '@/components/ui/button'

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ')

interface Props {
  onLogin: (token: string) => void
  onLogout: () => void
  isLoggedIn: boolean
}

export function AuthButton({ onLogin, onLogout, isLoggedIn }: Props) {
  const login = useGoogleLogin({
    onSuccess: (response) => onLogin(response.access_token),
    onError: () => console.error('Google login failed'),
    scope: SCOPES,
  })

  if (isLoggedIn) {
    return (
      <Button variant="outline" onClick={onLogout}>
        Sign out
      </Button>
    )
  }

  return (
    <Button onClick={() => login()}>Sign in with Google</Button>
  )
}
