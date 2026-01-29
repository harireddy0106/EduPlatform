//admin/src/Register.jsx
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import axios from 'axios';
import {
    Shield,
    Mail,
    Lock,
    User,
    Loader2,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false
    });

    const [state, setState] = useState({
        loading: false,
        showPassword: false,
        showConfirmPassword: false,
        emailValid: null,
        passwordStrength: 0,
        validationErrors: {}
    });

    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    // Password strength requirements
    const passwordRequirements = {
        minLength: 6,
        hasUpperCase: /[A-Z]/,
        hasLowerCase: /[a-z]/,
        hasNumbers: /\d/,
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
        noSpaces: /^\S*$/
    };

    // Check password strength
    const checkPasswordStrength = (password) => {
        let strength = 0;

        if (password.length >= passwordRequirements.minLength) strength += 20;
        if (passwordRequirements.hasUpperCase.test(password)) strength += 20;
        if (passwordRequirements.hasLowerCase.test(password)) strength += 20;
        if (passwordRequirements.hasNumbers.test(password)) strength += 20;
        if (passwordRequirements.hasSpecialChar.test(password)) strength += 20;

        // Penalty for common patterns
        const commonPatterns = ['password', '123456', 'qwerty', 'admin'];
        if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
            strength = Math.max(0, strength - 30);
        }

        return strength;
    };

    // Validate email with debounce
    const validateEmail = async (email) => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setState(prev => ({ ...prev, emailValid: false, validationErrors: { ...prev.validationErrors, email: 'Invalid email format' } }));
            return;
        }

        try {
            const response = await axios.post(`${API}/auth/check-email`, { email });
            const exists = response.data.exists;

            setState(prev => ({
                ...prev,
                emailValid: !exists, // Valid if it doesn't exist
                validationErrors: {
                    ...prev.validationErrors,
                    email: exists ? 'Email already registered' : null
                }
            }));
        } catch {
            setState(prev => ({ ...prev, emailValid: null }));
        }
    };

    // Handle input changes
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

        // Validate email in real-time
        if (name === 'email') {
            validateEmail(newValue);
        }

        // Check password strength
        if (name === 'password') {
            const strength = checkPasswordStrength(newValue);
            setState(prev => ({
                ...prev,
                passwordStrength: strength
            }));

            if (formData.confirmPassword && newValue !== formData.confirmPassword) {
                setState(prev => ({
                    ...prev,
                    validationErrors: {
                        ...prev.validationErrors,
                        confirmPassword: 'Passwords do not match'
                    }
                }));
            } else if (formData.confirmPassword) {
                setState(prev => ({
                    ...prev,
                    validationErrors: {
                        ...prev.validationErrors,
                        confirmPassword: null
                    }
                }));
            }
        }

        if (name === 'confirmPassword') {
            if (value !== formData.password) {
                setState(prev => ({
                    ...prev,
                    validationErrors: {
                        ...prev.validationErrors,
                        confirmPassword: 'Passwords do not match'
                    }
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    validationErrors: {
                        ...prev.validationErrors,
                        confirmPassword: null
                    }
                }));
            }
        }
    };

    // Validate form before submission
    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim() || formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        } else if (state.emailValid === false) {
            errors.email = 'Email already registered';
        }

        const strength = checkPasswordStrength(formData.password);
        if (strength < 60) {
            errors.password = 'Password is too weak';
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.termsAccepted) {
            errors.termsAccepted = 'You must accept the terms';
        }

        setState(prev => ({ ...prev, validationErrors: errors }));
        return Object.keys(errors).length === 0;
    };

    const getStrengthColor = () => {
        const strength = state.passwordStrength;
        if (strength >= 80) return 'bg-green-500';
        if (strength >= 60) return 'bg-yellow-500';
        if (strength >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the form errors');
            return;
        }

        setState(prev => ({ ...prev, loading: true }));
        try {
            // Register as admin
            const response = await axios.post(`${API}/auth/register`, {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'admin'
            });

            if (response.data.token) {
                login(
                    response.data.token,
                    response.data.refreshToken || response.data.token,
                    response.data.user
                );
                toast.success('Admin account created successfully');
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error(error);
            const errorDetail = error.response?.data?.detail || 'Registration failed';
            toast.error(errorDetail);

            if (error.response?.data?.detail === "Email already registered") {
                setState(prev => ({ ...prev, emailValid: false }));
            }
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

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

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                        <p className="text-gray-600 text-sm mt-1">Register for administrator access</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Administrator Name"
                                    required
                                    autoComplete="name"
                                />
                            </div>
                            {state.validationErrors.name && (
                                <p className="mt-1 text-sm text-red-500 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {state.validationErrors.name}
                                </p>
                            )}
                        </div>

                        {/* Email Field */}
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
                                    className={`w-full pl-11 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.email || state.emailValid === false
                                        ? 'border-red-500'
                                        : state.emailValid === true
                                            ? 'border-green-500'
                                            : 'border-gray-300'
                                        }`}
                                    placeholder="admin@yourdomain.com"
                                    required
                                    autoComplete="email"
                                />
                                {state.emailValid === true && (
                                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                                )}
                                {state.emailValid === false && (
                                    <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {state.validationErrors.email && (
                                <p className="mt-1 text-sm text-red-500 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {state.validationErrors.email}
                                </p>
                            )}
                            {state.emailValid === false && !state.validationErrors.email && (
                                <p className="mt-1 text-sm text-red-500">
                                    Email already registered
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
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
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {state.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getStrengthColor()} transition-all duration-300`}
                                        style={{ width: `${state.passwordStrength}%` }}
                                    ></div>
                                </div>
                            )}

                            {state.validationErrors.password && (
                                <p className="mt-1 text-sm text-red-500 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {state.validationErrors.password}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={state.showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${state.validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="••••••••••••"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {state.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {state.validationErrors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-500 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {state.validationErrors.confirmPassword}
                                </p>
                            )}
                        </div>

                        {/* Terms */}
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                name="termsAccepted"
                                checked={formData.termsAccepted}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                            />
                            <span className="ml-2 text-sm text-gray-600">
                                I agree to the{' '}
                                <Link to="/admin/terms" className="text-blue-600 hover:underline">
                                    Terms of Service
                                </Link>
                                {' '}and{' '}
                                <Link to="/admin/privacy" className="text-blue-600 hover:underline">
                                    Privacy Policy
                                </Link>
                            </span>
                        </div>
                        {state.validationErrors.termsAccepted && (
                            <p className="text-sm text-red-500 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {state.validationErrors.termsAccepted}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={state.loading}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {state.loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-center text-gray-600 text-sm">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                            >
                                Login here
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Register;