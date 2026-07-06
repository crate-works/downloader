import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getAuthStatus } from '#/server/functions/auth.ts';
import { appPath } from '#/shared/paths.ts';
import { useAuthStore } from '#/store/authStore.ts';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser } = useAuthStore();

  const { data, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: () => getAuthStatus(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isCheckingAuth) {
      setUser(data?.user ?? null);
    }
  }, [data, isCheckingAuth, setUser]);

  const login = () => {
    window.location.href = appPath('api/auth/login');
  };

  const logout = () => {
    window.location.href = appPath('api/auth/logout');
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || isCheckingAuth,
    login,
    logout,
  };
};
