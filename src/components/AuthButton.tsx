import { useGoogleLogin } from '@react-oauth/google'
import { Button } from '@/components/ui/button'

// drive.file: ユーザーが明示的に選択したファイルのみにアクセス（最小権限）
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

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
