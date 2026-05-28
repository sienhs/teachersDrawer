import { create } from 'zustand';
import { setAccessToken } from '../api/instance';
import type { User } from '../types/auth';

// accessToken은 메모리에만, user는 새로고침 복구를 위해 localStorage에 보조 저장
const USER_STORAGE_KEY = 'auth_user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, user: User) => void;
  clearAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (accessToken, user) => {
    setAccessToken(accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    set({ accessToken, user, isAuthenticated: true });
  },

  clearAuth: () => {
    setAccessToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
