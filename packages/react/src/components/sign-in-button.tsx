import { useState, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { SubdomainResolver, getConfig } from '@clowk/core';

export interface SignInButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  redirectUri?: string;
  publishableKey?: string;
}

export function SignInButton({ children = 'Sign In', redirectUri, publishableKey, ...props }: SignInButtonProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const resolve = async () => {
      try {
        const resolver = new SubdomainResolver({ publishableKey });
        const baseUrl = await resolver.resolveUrl();
        const config = getConfig();
        const redirect = redirectUri ?? `${window.location.origin}${config.callbackPath}`;
        const signInUrl = `${baseUrl}/sign-in?redirect_uri=${encodeURIComponent(redirect)}`;

        setUrl(signInUrl);
      } catch {
        // Cannot resolve URL — button stays non-functional
      }
    };

    resolve();
  }, [publishableKey, redirectUri]);

  const handleClick = () => {
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={!url} {...props}>
      {children}
    </button>
  );
}
