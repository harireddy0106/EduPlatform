//admin/src/Login.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield,
    Mail,
    Lock,
    Loader2,
    Eye,
    EyeOff,
    Key,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
        verificationCode: '',
        newPassword: ''
    });

    const [state, setState] = useState({
        loading: false,
        showPassword: false,
        validationErrors: {},
        showResetPassword: false, // true = showing forgot password flow
        resetStep: 1 // 1 = Enter Email, 2 = Enter Code & New Password
    });

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Clear validation error for this field
        if (state.validationErrors[name]) {
            setState(prev => ({
                ...prev,
                validationErrors: {
                    ...prev.validationErrors,
                    [name]: null
                }
            }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!state.showResetPassword && !formData.password) {
            errors.password = 'Password is required';
        }

        setState(prev => ({ ...prev, validationErrors: errors }));
        return Object.keys(errors).length === 0;
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setState(prev => ({ ...prev, loading: true }));

        try {
            await login(formData.email, formData.password);
            toast.success('Login successful!');
            navigate('/admin/dashboard');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    // Step 1: Send Reset Link
    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (!formData.email) {
            setState(prev => ({
                ...prev,
                validationErrors: { ...prev.validationErrors, email: 'Email is required for password reset' }
            }));
            toast.error('Please enter your email address');
            return;
        }

        try {
            setState(prev => ({ ...prev, loading: true }));

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
            });

            if (response.ok) {
                toast.success('Verification code sent to your email');
                // Move to step 2
                setState(prev => ({ ...prev, resetStep: 2 }));
            } else {
                const data = await response.json();
                toast.error(data.detail || 'Failed to send reset instructions');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    // Step 2: Reset Password with Code
    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        if (!formData.verificationCode || formData.verificationCode.length !== 6) {
            errors.verificationCode = 'Please enter the 6-digit verification code';
        }
        if (!formData.newPassword || formData.newPassword.length < 6) {
            errors.newPassword = 'Password must be at least 6 characters';
        }

        if (Object.keys(errors).length > 0) {
            setState(prev => ({ ...prev, validationErrors: errors }));
            return;
        }

        try {
            setState(prev => ({ ...prev, loading: true }));

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    code: formData.verificationCode,
                    newPassword: formData.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Password reset successfully! You can now login.');
                // Reset everything and go back to login
                setFormData(prev => ({ ...prev, password: '', verificationCode: '', newPassword: '' }));
                setState(prev => ({
                    ...prev,
                    showResetPassword: false,
                    resetStep: 1
                }));
            } else {
                toast.error(data.detail || 'Failed to reset password');
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error. Please try again.');
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    // Render Password Login Form
    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="admin@yourdomain.com"
                        required
                        autoComplete="email"
                    />
                </div>
                {state.validationErrors.email && (
                    <p className="mt-1 text-sm text-red-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {state.validationErrors.email}
                    </p>
                )}
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, showResetPassword: true, resetStep: 1 }))}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Forgot Password?
                    </button>
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={state.showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.password ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="••••••••••••"
                        required
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={state.showPassword ? "Hide password" : "Show password"}
                    >
                        {state.showPassword ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {state.validationErrors.password && (
                    <p className="mt-1 text-sm text-red-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {state.validationErrors.password}
                    </p>
                )}
            </div>

            <label className="flex items-center">
                <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">
                    Remember this device
                </span>
            </label>

            <button
                type="submit"
                disabled={state.loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {state.loading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Logging in...
                    </>
                ) : (
                    'Login into Dashboard'
                )}
            </button>
        </form>
    );

    // Render Forgot Password Step 1: Email Input
    const renderForgotPasswordStep1 = () => (
        <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="text-center mb-4">
                <Key className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                <p className="text-gray-600 text-sm">Enter your email to receive reset instructions</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="admin@yourdomain.com"
                        required
                    />
                </div>
                {state.validationErrors.email && (
                    <p className="mt-1 text-sm text-red-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {state.validationErrors.email}
                    </p>
                )}
            </div>

            <div className="flex space-x-3">
                <button
                    type="submit"
                    disabled={state.loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {state.loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        'Send Reset Link'
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, showResetPassword: false }))}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );

    // Render Forgot Password Step 2: Code and New Password
    const renderForgotPasswordStep2 = () => (
        <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
            <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-gray-900">Set New Password</h3>
                <p className="text-gray-600 text-sm">
                    Enter the verification code sent to <br />
                    <span className="font-semibold text-gray-800">{formData.email}</span>
                </p>
            </div>

            {/* Verification Code */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                </label>
                <input
                    type="text"
                    name="verificationCode"
                    value={formData.verificationCode}
                    onChange={handleChange}
                    maxLength="6"
                    className={`w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.verificationCode ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="000000"
                    required
                />
                {state.validationErrors.verificationCode && (
                    <p className="mt-1 text-sm text-red-500 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {state.validationErrors.verificationCode}
                    </p>
                )}
            </div>

            {/* New Password */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={state.showPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="New secure password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={state.showPassword ? "Hide password" : "Show password"}
                    >
                        {state.showPassword ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {state.validationErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {state.validationErrors.newPassword}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={state.loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {state.loading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Resetting...
                    </>
                ) : (
                    'Reset Password'
                )}
            </button>

            <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, showResetPassword: false, resetStep: 1 }))}
                className="w-full text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center"
            >
                ← Back to Login
            </button>
        </form>
    );

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">

                    {/* Logo */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative">
                            <Shield className="w-10 h-10 text-blue-600" />
                        </div>
                        <span className="ml-2 text-xl font-bold">Admin Portal</span>
                    </div>

                    {!state.showResetPassword && (
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                            <p className="text-gray-600 text-sm mt-1">sign in to manage your platform</p>
                        </div>
                    )}

                    {/* Render current view */}
                    {state.showResetPassword
                        ? (state.resetStep === 1 ? renderForgotPasswordStep1() : renderForgotPasswordStep2())
                        : renderLoginForm()
                    }

                    {/* Footer Links */}
                    {!state.showResetPassword && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-center text-gray-600 text-sm">
                                New to admin portal?{' '}
                                <Link
                                    to="/register"
                                    className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                                >
                                    Register here
                                </Link>
                            </p>
                        </div>
                    )}

                    {/* Security info */}
                    {!state.showResetPassword && (
                        <div className="mt-8 flex justify-center">
                            <div className="flex items-center text-xs text-gray-400">
                                <Shield className="w-3 h-3 mr-1" />
                                <span>Secure Admin Gateway</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;