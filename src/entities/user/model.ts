export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  provider: 'google' | 'naver'
  provider_id: string
  created_at: string
  updated_at: string
}

export interface UserCreateData {
  id: string
  email: string
  name?: string
  avatar_url?: string
  provider: 'google' | 'naver'
  provider_id: string
}

export interface UserUpdateData {
  name?: string
  avatar_url?: string
  updated_at?: string
}