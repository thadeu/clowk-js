import { useState, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { SubdomainResolver, getConfig } from '@clowk/core'

export interface SignUpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  redirectUri?: string
  publishableKey?: string
}

export function SignUpButton({
  children = 'Sign Up',
  redirectUri,
  publishableKey,
  ...props
}: SignUpButtonProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const resolve = async () => {
      try {
        const resolver = new SubdomainResolver({ publishableKey })
        const baseUrl = await resolver.resolveUrl()
        const config = getConfig()
        const redirect = redirectUri ?? `${window.location.origin}${config.callbackPath}`
        const signUpUrl = `${baseUrl}/sign-up?redirect_uri=${encodeURIComponent(redirect)}`
        setUrl(signUpUrl)
      } catch {
        // Cannot resolve URL
      }
    }

    resolve()
  }, [publishableKey, redirectUri])

  const handleClick = () => {
    if (url) {
      window.location.href = url
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={!url} {...props}>
      {children}
    </button>
  )
}
