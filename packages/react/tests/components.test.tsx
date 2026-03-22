import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { type ReactNode } from 'react'
import { resetConfig, configure } from '@clowk/core'
import { ClowkProvider } from '../src/provider'
import { SignInButton } from '../src/components/sign-in-button'
import { SignUpButton } from '../src/components/sign-up-button'
import { SignOutButton } from '../src/components/sign-out-button'

function Wrapper({ children }: { children: ReactNode }) {
  return <ClowkProvider>{children}</ClowkProvider>
}

describe('React Components', () => {
  beforeEach(() => {
    resetConfig()
  })

  describe('SignInButton', () => {
    it('renders a button with default text', () => {
      const { container } = render(<SignInButton />)
      const button = container.querySelector('button')

      expect(button).not.toBeNull()
      expect(button!.textContent).toBe('Sign In')
    })

    it('renders custom children text', () => {
      const { container } = render(<SignInButton>Log In</SignInButton>)
      const button = container.querySelector('button')

      expect(button).not.toBeNull()
      expect(button!.textContent).toBe('Log In')
    })

    it('renders with type="button"', () => {
      const { container } = render(<SignInButton />)
      const button = container.querySelector('button')

      expect(button!.getAttribute('type')).toBe('button')
    })

    it('is disabled initially (before URL resolution)', () => {
      const { container } = render(<SignInButton />)
      const button = container.querySelector('button')

      expect(button!.disabled).toBe(true)
    })

    it('forwards HTML button props', () => {
      const { container } = render(
        <SignInButton className="my-btn" data-testid="sign-in" />
      )
      const button = container.querySelector('button')

      expect(button!.className).toBe('my-btn')
      expect(button!.getAttribute('data-testid')).toBe('sign-in')
    })

    it('accepts publishableKey prop', () => {
      // Should not throw
      const { container } = render(
        <SignInButton publishableKey="pk_test_123" />
      )
      expect(container.querySelector('button')).not.toBeNull()
    })

    it('accepts redirectUri prop', () => {
      const { container } = render(
        <SignInButton redirectUri="https://myapp.com/callback" />
      )
      expect(container.querySelector('button')).not.toBeNull()
    })
  })

  describe('SignUpButton', () => {
    it('renders a button with default text', () => {
      const { container } = render(<SignUpButton />)
      const button = container.querySelector('button')

      expect(button).not.toBeNull()
      expect(button!.textContent).toBe('Sign Up')
    })

    it('renders custom children text', () => {
      const { container } = render(<SignUpButton>Register</SignUpButton>)
      const button = container.querySelector('button')

      expect(button).not.toBeNull()
      expect(button!.textContent).toBe('Register')
    })

    it('renders with type="button"', () => {
      const { container } = render(<SignUpButton />)
      const button = container.querySelector('button')

      expect(button!.getAttribute('type')).toBe('button')
    })

    it('is disabled initially (before URL resolution)', () => {
      const { container } = render(<SignUpButton />)
      const button = container.querySelector('button')

      expect(button!.disabled).toBe(true)
    })

    it('forwards HTML button props', () => {
      const { container } = render(
        <SignUpButton className="signup-btn" id="signup" />
      )
      const button = container.querySelector('button')

      expect(button!.className).toBe('signup-btn')
      expect(button!.id).toBe('signup')
    })

    it('accepts publishableKey prop', () => {
      const { container } = render(
        <SignUpButton publishableKey="pk_test_123" />
      )
      expect(container.querySelector('button')).not.toBeNull()
    })
  })

  describe('SignOutButton', () => {
    it('renders nothing when not signed in', () => {
      const { container } = render(
        <Wrapper>
          <SignOutButton />
        </Wrapper>
      )

      expect(container.querySelector('button')).toBeNull()
    })

    it('does not render with custom text when not signed in', () => {
      const { container } = render(
        <Wrapper>
          <SignOutButton>Log Out</SignOutButton>
        </Wrapper>
      )

      expect(container.querySelector('button')).toBeNull()
    })

    it('requires ClowkProvider (uses useAuth internally)', () => {
      expect(() => {
        render(<SignOutButton />)
      }).toThrow('useAuth must be used within a <ClowkProvider>')
    })
  })

  describe('ClowkProvider', () => {
    it('renders children', () => {
      const { getByText } = render(
        <ClowkProvider>
          <div>Hello</div>
        </ClowkProvider>
      )

      expect(getByText('Hello')).toBeDefined()
    })

    it('accepts publishableKey prop', () => {
      const { getByText } = render(
        <ClowkProvider publishableKey="pk_test_123">
          <div>Content</div>
        </ClowkProvider>
      )

      expect(getByText('Content')).toBeDefined()
    })

    it('accepts tokenParam prop', () => {
      const { getByText } = render(
        <ClowkProvider tokenParam="auth_token">
          <div>Content</div>
        </ClowkProvider>
      )

      expect(getByText('Content')).toBeDefined()
    })

    it('accepts afterSignOutPath prop', () => {
      const { getByText } = render(
        <ClowkProvider afterSignOutPath="/goodbye">
          <div>Content</div>
        </ClowkProvider>
      )

      expect(getByText('Content')).toBeDefined()
    })

    it('can be nested (inner wins)', () => {
      const { getByText } = render(
        <ClowkProvider>
          <ClowkProvider publishableKey="pk_inner">
            <div>Nested</div>
          </ClowkProvider>
        </ClowkProvider>
      )

      expect(getByText('Nested')).toBeDefined()
    })
  })
})
