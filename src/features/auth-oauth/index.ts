/**
 * Auth OAuth Feature Index (Feature-Sliced Design)
 * 
 * Exports all authentication-related components, hooks, and utilities
 * following Feature-Sliced Design principles
 */

// OAuth Provider Configurations
export { googleOAuthProvider, GoogleOAuthUtils, GoogleOAuthError, GoogleOAuthErrorCodes } from './lib/google-provider'
export type { GoogleProfile } from './lib/google-provider'

export { 
  naverOAuthProvider, 
  NaverProvider, 
  NaverOAuthUtils, 
  NaverOAuthError, 
  NaverOAuthErrorCodes,
  NaverOAuthConfig 
} from './lib/naver-provider'
export type { NaverProfile, NaverOAuthErrorCode } from './lib/naver-provider'

// Authentication Hooks
export { 
  useAuth, 
  useAuthRedirect, 
  useAuthGuard, 
  useGoogleAuth, 
  useNaverAuth,
  SessionUtils,
  AuthPersistence,
  AuthErrorHandler,
  ServerAuthUtils
} from './hooks/use-auth'
export type { 
  AuthState, 
  AuthError, 
  SignInOptions 
} from './hooks/use-auth'

// Authentication Components
export { 
  SignIn, 
  SignInButton, 
  SignOut as SignOutFromSignIn, 
  UserProfile, 
  AuthStatus 
} from './components/sign-in'
export type { 
  SignInProps, 
  SignInButtonProps, 
  UserProfileProps, 
  AuthStatusProps 
} from './components/sign-in'

export { 
  SignOut, 
  SignOutButton, 
  SignOutMenuItem, 
  SignOutDialog, 
  useSignOut 
} from './components/sign-out'
export type { 
  SignOutProps, 
  SignOutButtonProps, 
  SignOutMenuItemProps, 
  SignOutDialogProps 
} from './components/sign-out'