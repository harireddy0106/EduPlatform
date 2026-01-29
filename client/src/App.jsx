import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Shield, AlertCircle } from 'lucide-react';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import StudentDashboard from '@/pages/StudentDashboard';
import InstructorDashboard from '@/pages/InstructorDashboard';
import CoursePage from '@/pages/CoursePage';

// Additional pages
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import TwoFactorAuth from '@/pages/TwoFactorAuth';
import Profile from '@/pages/Profile';

import Help from '@/pages/Help';
import NotFound from '@/pages/NotFound';
import CertificateView from '@/pages/CertificateView';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import InstructorProfile from '@/pages/InstructorProfile';

// Components
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import SessionTimeout from '@/components/SessionTimeout';
import SecurityCheck from '@/components/SecurityCheck';
import GlobalLoading from '@/components/GlobalLoading';

import '@/index.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes

// Auth Context
import { AuthContext } from '@/context/AuthContext';

// Configure axios defaults
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = false; // Set to true if using cookies
axios.defaults.timeout = 10000; // 10 seconds timeout

// Axios response interceptor for global error handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API}/auth/refresh`, { refreshToken });
          const { accessToken, user } = response.data;

          localStorage.setItem('token', accessToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

          if (window.updateAuthUser) {
            window.updateAuthUser(user);
          }

          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        if (window.forceLogout) {
          window.forceLogout();
        }
      }
    }

    if (originalRequest.skipGlobalErrorHandler) {
      return Promise.reject(error);
    }

    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data.detail || data.error?.message || data.message || 'An error occurred';

      switch (status) {
        case 400:
          toast.error(errorMessage);
          break;
        case 401:
          if (data.code !== 'TOKEN_EXPIRED') {
            toast.error('Session expired. Please login again.');
            if (window.forceLogout) {
              setTimeout(() => window.forceLogout(), 1000);
            }
          }
          break;
        case 403:
          toast.error(errorMessage || 'Access denied');
          break;
        case 404:
          toast.error(errorMessage || 'Resource not found');
          break;
        case 429:
          toast.error('Too many requests. Please wait.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(errorMessage);
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

const createActivityTracker = (onTimeout) => {
  let timeoutId;

  const resetTimer = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(onTimeout, SESSION_TIMEOUT);
  };

  const setupListeners = () => {
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimer);
    });
  };

  const removeListeners = () => {
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.removeEventListener(event, resetTimer);
    });
    clearTimeout(timeoutId);
  };

  return { resetTimer, setupListeners, removeListeners };
};

function App() {
  const [authState, setAuthState] = useState({
    user: null,
    token: localStorage.getItem('token') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    isLoading: true,
    isSessionExpired: false,
    lastActivity: Date.now(),
    permissions: [],
    securityLevel: 'medium'
  });

  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    lastChecked: null
  });

  const tokenRefreshInterval = useRef(null);
  const activityTracker = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: true }));
      toast.success('You are back online');
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: false }));
      toast.error('You are offline. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchUser();
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (authState.user) {
      const handleSessionTimeout = () => {
        setAuthState(prev => ({ ...prev, isSessionExpired: true }));
        toast.warning('Session expired due to inactivity');
      };

      activityTracker.current = createActivityTracker(handleSessionTimeout);
      activityTracker.current.setupListeners();
      activityTracker.current.resetTimer();
    }

    return () => {
      if (activityTracker.current) {
        activityTracker.current.removeListeners();
      }
    };
  }, [authState.user]);

  useEffect(() => {
    if (authState.user && authState.token) {
      tokenRefreshInterval.current = setInterval(() => {
        refreshToken();
      }, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
      }
    };
  }, [authState.user, authState.token]);

  useEffect(() => {
    window.forceLogout = logout;
    window.updateAuthUser = (userData) => {
      setAuthState(prev => ({ ...prev, user: userData }));
    };

    return () => {
      delete window.forceLogout;
      delete window.updateAuthUser;
    };
  }, []);

  const fetchUser = async () => {
    try {
      const [userResponse, permissionsResponse] = await Promise.all([
        axios.get(`${API}/auth/me`),
        axios.get(`${API}/auth/permissions`)
      ]);

      setAuthState(prev => ({
        ...prev,
        user: userResponse.data,
        permissions: permissionsResponse.data.permissions || [],
        securityLevel: userResponse.data.securityLevel || 'medium',
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to fetch user:', error);

      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete axios.defaults.headers.common['Authorization'];
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    try {
      const response = await axios.post(`${API}/auth/refresh`, { refreshToken });
      const { accessToken, user } = response.data;

      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      setAuthState(prev => ({
        ...prev,
        token: accessToken,
        user: user || prev.user,
        lastActivity: Date.now()
      }));

    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  };

  const login = async (token, refreshToken, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setAuthState(prev => ({
      ...prev,
      user: userData,
      token,
      refreshToken,
      lastActivity: Date.now(),
      isSessionExpired: false
    }));

    if (window.gtag) {
      window.gtag('event', 'login', {
        method: userData.role || 'unknown'
      });
    }
  };

  const logout = async (manual = false) => {
    try {
      if (manual && authState.token) {
        await axios.post(`${API}/auth/logout`, {
          refreshToken: authState.refreshToken
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('lastRoute');

      delete axios.defaults.headers.common['Authorization'];

      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isSessionExpired: false,
        lastActivity: Date.now(),
        permissions: [],
        securityLevel: 'medium'
      });

      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
      }

      if (activityTracker.current) {
        activityTracker.current.removeListeners();
      }

      navigate('/');

      if (manual) {
        toast.success('Logged out successfully');
      }
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const response = await axios.put(`${API}/auth/profile`, updates);
      setAuthState(prev => ({ ...prev, user: response.data.user }));
      toast.success('Profile updated successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const resetSession = () => {
    setAuthState(prev => ({ ...prev, isSessionExpired: false }));
    if (activityTracker.current) {
      activityTracker.current.resetTimer();
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post(`${API}/auth/change-password`, {
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
      return false;
    }
  };

  const verifyTwoFactor = async (token) => {
    try {
      const response = await axios.post(`${API}/auth/verify-2fa`, { token });
      const { accessToken, refreshToken, user } = response.data;
      await login(accessToken, refreshToken, user);
      return true;
    } catch {
      toast.error('Invalid 2FA code');
      return false;
    }
  };

  const handleActivity = () => {
    setAuthState(prev => ({ ...prev, lastActivity: Date.now() }));
    if (activityTracker.current) {
      activityTracker.current.resetTimer();
    }
  };

  if (authState.isLoading) {
    return <GlobalLoading />;
  }

  if (!networkStatus.isOnline && authState.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">You are offline</h2>
        <p className="text-gray-600 text-center mb-6">
          Please check your internet connection. Some features may not be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        isLoading: authState.isLoading,
        permissions: authState.permissions,
        securityLevel: authState.securityLevel,
        isSessionExpired: authState.isSessionExpired,
        login,
        logout,
        updateUserProfile,
        changePassword,
        verifyTwoFactor,
        handleActivity,
        resetSession,
        networkStatus
      }}
    >

      <SecurityCheck user={authState.user} />

      <SessionTimeout
        isOpen={authState.isSessionExpired}
        onConfirm={() => {
          resetSession();
          navigate('/dashboard');
        }}
        onLogout={() => logout(false)}
      />

      <Routes>
        <Route path="/" element={authState.user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={authState.user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={authState.user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/reset-password" element={authState.user ? <Navigate to="/dashboard" /> : <ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-2fa" element={<TwoFactorAuth />} />
        <Route path="/certificate/:code" element={<CertificateView />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                authState.user?.role === 'student' ? (
                  <StudentDashboard />
                ) : authState.user?.role === 'instructor' ? (
                  <InstructorDashboard />
                ) : authState.user?.role === 'admin' ? (
                  <div className="flex flex-col items-center justify-center p-10 mt-10 text-center">
                    <Shield className="w-16 h-16 text-blue-600 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Admin Portal Moved</h1>
                    <p className="mb-6 text-gray-600">The admin dashboard is now a separate, secure application.</p>
                    <a href="http://localhost:5174" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                      Go to Admin Portal
                    </a>
                  </div>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/course/:courseId" element={<CoursePage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/help" element={<Help />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute requiredRole="instructor" />}>
          <Route element={<Layout />}>
            <Route path="/instructor/profile" element={<InstructorProfile />} />
            <Route path="/instructor/*" element={<InstructorDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>


      <Toaster
        position="top-right"
        richColors
        expand={true}
        theme="light"
        closeButton
        duration={4000}
      />

      <div
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition"
        onClick={handleActivity}
        title="Refresh session"
      >
        <Shield className="w-5 h-5" />
      </div>
    </AuthContext.Provider>
  );
}

export default App;