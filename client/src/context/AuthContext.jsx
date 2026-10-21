import { createContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";
import { setLogoutHandler, setAccessToken } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  // Listen for automatic logout triggered by expired refresh token in API interceptor
  useEffect(() => {
    setLogoutHandler(() => {
      setUser(null);
      setAccessToken(null);
    });
  }, []);

  // Silent session restore on app mount using httpOnly refresh token cookie
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const refreshData = await authService.refresh();
        if (refreshData?.accessToken && isMounted) {
          const meData = await authService.getMe();
          if (meData?.user && isMounted) {
            setUser(meData.user);
          }
        }
      } catch {
        // No valid session/cookie — user simply remains unauthenticated
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      await authService.register(name, email, password);
      return await login(email, password);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
