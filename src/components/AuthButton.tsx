import { useGoogleLogin } from '@react-oauth/google'
import { Button } from '@/components/ui/button'

// documents: Docs API の読み書きに必須。
// drive.file だけでは Picker 選択後も Docs API が 404 を返すため使用できない。
const SCOPES = 'https://www.googleapis.com/auth/documents'

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

  return <Button onClick={() => login()}>Sign in with Google</Button>
}
