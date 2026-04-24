/**
 * AuthContext — Authentication and RBAC framework.
 *
 * Currently uses localStorage for user preferences and role simulation.
 * Designed for zero-change swap to Entra ID when Azure SWA is deployed:
 *   - Replace getUser() with /.auth/me endpoint
 *   - Replace role checks with Entra ID app roles
 *   - Replace localStorage with Azure Functions user store
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type UserRole = 'admin' | 'architect' | 'viewer';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatar?: string;        // Entra ID photo URL (future)
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  chatPosition: 'right' | 'bottom';
  fontSize: 'small' | 'medium' | 'large';
  showDiagramPreview: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'light',
  chatPosition: 'right',
  fontSize: 'medium',
  showDiagramPreview: true,
};

const STORAGE_KEY = 'iao_user_profile';

/** Load user from localStorage (will be replaced by Entra ID /.auth/me) */
function loadStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveStoredUser(user: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/** Create a default local user (replaced by Entra ID in production) */
function createDefaultUser(): UserProfile {
  return {
    id: 'local-user',
    displayName: 'IAO Architect',
    email: '',
    role: 'architect',
    preferences: { ...DEFAULT_PREFS },
  };
}

interface AuthContextValue {
  user: UserProfile;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isArchitect: boolean;
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'email'>>) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  setRole: (role: UserRole) => void;  // Admin only — will be Entra ID app roles
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_HIERARCHY: Record<UserRole, number> = { admin: 3, architect: 2, viewer: 1 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(() => loadStoredUser() ?? createDefaultUser());

  useEffect(() => { saveStoredUser(user); }, [user]);

  const hasRole = useCallback((required: UserRole) => {
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[required];
  }, [user.role]);

  const updateProfile = useCallback((updates: Partial<Pick<UserProfile, 'displayName' | 'email'>>) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setUser(prev => ({ ...prev, preferences: { ...prev.preferences, ...prefs } }));
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setUser(prev => ({ ...prev, role }));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: true,  // Always true for localStorage; Entra ID will check token
      hasRole,
      isAdmin: user.role === 'admin',
      isArchitect: hasRole('architect'),
      updateProfile,
      updatePreferences,
      setRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
