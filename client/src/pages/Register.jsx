//client/src/pages/Register.jsx

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  UserCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  ChevronRight,
  Key,
  Smartphone,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import ReCAPTCHA from 'react-google-recaptcha';
import PasswordStrengthBar from 'react-password-strength-bar';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    termsAccepted: false,
    newsletter: true
  });

  const [state, setState] = useState({
    loading: false,
    showPassword: false,
    showConfirmPassword: false,
    emailValid: null,
    passwordStrength: 0,
    passwordSuggestions: [],
    validationErrors: {},
    isCaptchaVerified: false,
    step: 1, // 1: Basic info, 2: Verification, 3: Success
    verificationCode: '',
    verificationSent: false,
    verificationLoading: false,
    remainingAttempts: 3
  });

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Password strength requirements
  const passwordRequirements = {
    minLength: 8,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumbers: /\d/,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
    noSpaces: /^\S*$/
  };

  // Check password strength
  const checkPasswordStrength = (password) => {
    let strength = 0;
    const suggestions = [];

    if (password.length >= passwordRequirements.minLength) {
      strength += 20;
    } else {
      suggestions.push(`At least ${passwordRequirements.minLength} characters`);
    }

    if (passwordRequirements.hasUpperCase.test(password)) {
      strength += 20;
    } else {
      suggestions.push('One uppercase letter');
    }

    if (passwordRequirements.hasLowerCase.test(password)) {
      strength += 20;
    } else {
      suggestions.push('One lowercase letter');
    }

    if (passwordRequirements.hasNumbers.test(password)) {
      strength += 20;
    } else {
      suggestions.push('One number');
    }

    if (passwordRequirements.hasSpecialChar.test(password)) {
      strength += 20;
    } else {
      suggestions.push('One special character');
    }

    if (!passwordRequirements.noSpaces.test(password)) {
      suggestions.push('No spaces allowed');
    }

    // Penalty for common patterns
    const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      strength = Math.max(0, strength - 20);
      suggestions.push('Avoid common patterns');
    }

    return { strength, suggestions };
  };

  // Validate email with debounce
  const validateEmail = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState(prev => ({ ...prev, emailValid: false }));
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/check-email`, { email });
      setState(prev => ({
        ...prev,
        emailValid: !response.data.exists
      }));

      if (response.data.exists) {
        toast.error('Email already registered');
      }
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
      const { strength, suggestions } = checkPasswordStrength(newValue);
      setState(prev => ({
        ...prev,
        passwordStrength: strength,
        passwordSuggestions: suggestions
      }));

      // Validate confirm password match
      if (formData.confirmPassword && newValue !== formData.confirmPassword) {
        setState(prev => ({
          ...prev,
          validationErrors: {
            ...prev.validationErrors,
            confirmPassword: 'Passwords do not match'
          }
        }));
      } else if (formData.confirmPassword && newValue === formData.confirmPassword) {
        setState(prev => ({
          ...prev,
          validationErrors: {
            ...prev.validationErrors,
            confirmPassword: null
          }
        }));
      }
    }

    // Validate confirm password match
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

    // Name validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    const { strength } = checkPasswordStrength(formData.password);
    if (strength < 60) {
      errors.password = 'Password is too weak';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Terms acceptance
    if (!formData.termsAccepted) {
      errors.termsAccepted = 'You must accept the terms and conditions';
    }

    // CAPTCHA validation (if enabled)
    if (RECAPTCHA_SITE_KEY && !state.isCaptchaVerified) {
      errors.captcha = 'Please complete the CAPTCHA verification';
    }

    setState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  };

  // Send verification email
  const sendVerificationEmail = async () => {
    if (state.emailValid === false) {
      toast.error('Email is already registered');
      return;
    }

    try {
      setState(prev => ({ ...prev, verificationLoading: true }));

      await axios.post(`${API}/auth/send-verification`, {
        email: formData.email,
        name: formData.name
      });

      setState(prev => ({
        ...prev,
        verificationSent: true,
        step: 3, // Move to verification (Step 3)
        remainingAttempts: 3
      }));

      toast.success('Verification email sent! Check your inbox.');

    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setState(prev => ({ ...prev, verificationLoading: false }));
    }
  };

  // Verify email code
  const verifyEmailCode = async () => {
    if (!state.verificationCode || state.verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setState(prev => ({ ...prev, verificationLoading: true }));

      const response = await axios.post(`${API}/auth/verify-email-code`, {
        email: formData.email,
        code: state.verificationCode
      });

      if (response.data.verified) {
        toast.success('Email verified successfully! Creating account...');
        await handleRegistration();
      }

    } catch (error) {
      const remaining = error.response?.data?.remainingAttempts;
      if (remaining !== undefined) {
        setState(prev => ({ ...prev, remainingAttempts: remaining }));
      }

      toast.error(error.response?.data?.detail || 'Invalid verification code');
    } finally {
      setState(prev => ({ ...prev, verificationLoading: false }));
    }
  };

  // Handle registration
  const handleRegistration = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await axios.post(`${API}/auth/register`, {
        ...formData,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      });

      // If immediate login is enabled
      if (response.data.token) {
        login(
          response.data.token,
          response.data.refreshToken,
          response.data.user
        );

        toast.success(`Welcome to EduPlatform, ${response.data.user.name}!`);

        // Redirect based on role
        if (response.data.user.role === 'instructor') {
          navigate('/instructor/dashboard', { state: { registered: true } });
        } else {
          navigate('/dashboard', { state: { registered: true } });
        }
      } else {
        // Email verification required
        setState(prev => ({ ...prev, step: 4 })); // Move to success (Step 4)
        toast.success('Registration successful! Please check your email to verify your account.');
      }

    } catch (error) {
      const errorDetail = error.response?.data?.detail || 'Registration failed';
      const errorCode = error.response?.data?.code;

      if (errorCode === 'EMAIL_EXISTS') {
        setState(prev => ({ ...prev, emailValid: false }));
        toast.error('Email already registered. Please use a different email or login.');
      } else if (errorCode === 'WEAK_PASSWORD') {
        toast.error('Password is too weak. Please choose a stronger password.');
      } else {
        toast.error(errorDetail);
      }

      // Increment CAPTCHA requirement on errors
      if (error.response?.status === 429) {
        toast.error('Too many registration attempts. Please try again later.');
      }

    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle CAPTCHA verification
  const handleCaptchaChange = (token) => {
    setState(prev => ({ ...prev, isCaptchaVerified: !!token }));
  };

  // Resend verification code
  const resendVerificationCode = async () => {
    if (state.remainingAttempts <= 0) {
      toast.error('Too many attempts. Please try again later.');
      return;
    }

    await sendVerificationEmail();
  };

  // Render Step 1: Role Selection
  const renderRoleSelection = () => (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Join EduPlatform</h2>
        <p className="text-gray-600">
          Choose how you want to use the platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({ ...prev, role: 'student' }));
            setState(prev => ({ ...prev, step: 2 }));
          }}
          className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 transition-all text-left"
        >
          <div className="flex items-start">
            <div className="p-3 bg-sky-100 rounded-lg group-hover:bg-sky-200 transition-colors">
              <UserCircle className="w-8 h-8 text-sky-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-sky-700">Student</h3>
              <p className="text-gray-500 text-sm mt-1">
                I want to learn skills, enroll in courses, and earn certificates.
              </p>
            </div>
            <div className="absolute right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-6 h-6 text-sky-600" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({ ...prev, role: 'instructor' }));
            setState(prev => ({ ...prev, step: 2 }));
          }}
          className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
        >
          <div className="flex items-start">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <GraduationCap className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-700">Instructor</h3>
              <p className="text-gray-500 text-sm mt-1">
                I want to create courses, teach students, and earn revenue.
              </p>
            </div>
            <div className="absolute right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  // Render Step 2: Registration Form
  const renderRegistrationForm = () => (
    <>
      <div className="mb-6">
        <button
          onClick={() => setState(prev => ({ ...prev, step: 1 }))}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center"
        >
          <ChevronRight className="w-4 h-4 transform rotate-180 mr-1" />
          Back to role selection
        </button>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {formData.role === 'instructor' ? 'Instructor Registration' : 'Student Registration'}
        </h2>
        <p className="text-center text-gray-600">
          Create your {formData.role} account
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendVerificationEmail(); }} className="space-y-5">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              data-testid="register-name-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all ${state.validationErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="John Doe"
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
              data-testid="register-email-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-11 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all ${state.validationErrors.email || state.emailValid === false
                ? 'border-red-500'
                : state.emailValid === true
                  ? 'border-green-500'
                  : 'border-gray-300'
                }`}
              placeholder="your@email.com"
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
          {state.emailValid === false && (
            <p className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Email already registered. <Link to="/login" className="text-sky-600 hover:underline ml-1">Login instead?</Link>
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
              data-testid="register-password-input"
              type={state.showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all ${state.validationErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="••••••••"
              required
              autoComplete="new-password"
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

          {/* Password Strength Bar */}
          {formData.password && (
            <div className="mt-2">
              <PasswordStrengthBar
                password={formData.password}
                minLength={8}
                scoreWords={['Very Weak', 'Weak', 'Okay', 'Good', 'Strong']}
                shortScoreWord="Too short"
                className="mt-1"
              />

              {/* Password requirements */}
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium mb-1">Password must contain:</p>
                <ul className="grid grid-cols-2 gap-1">
                  {[
                    `At least ${passwordRequirements.minLength} characters`,
                    'One uppercase letter',
                    'One lowercase letter',
                    'One number',
                    'One special character',
                    'No spaces'
                  ].map((req, index) => (
                    <li key={index} className="flex items-center">
                      {checkRequirement(req, formData.password) ? (
                        <Check className="w-3 h-3 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-3 h-3 text-gray-300 mr-2" />
                      )}
                      <span className={checkRequirement(req, formData.password) ? 'text-green-600' : 'text-gray-500'}>
                        {req}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
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
              data-testid="register-confirm-password-input"
              type={state.showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all ${state.validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={state.showConfirmPassword ? "Hide password" : "Show password"}
            >
              {state.showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {state.validationErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {state.validationErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-3">
          <label className="flex items-start">
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded mt-1"
            />
            <span className="ml-2 text-sm text-gray-600">
              I agree to the{' '}
              <Link to="/terms" className="text-sky-600 hover:underline font-medium">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-sky-600 hover:underline font-medium">
                Privacy Policy
              </Link>
            </span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              name="newsletter"
              checked={formData.newsletter}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded mt-1"
            />
            <span className="ml-2 text-sm text-gray-600">
              Subscribe to newsletter for updates and course recommendations
            </span>
          </label>

          {state.validationErrors.termsAccepted && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {state.validationErrors.termsAccepted}
            </p>
          )}
        </div>

        {/* CAPTCHA */}
        {RECAPTCHA_SITE_KEY && (
          <div>
            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
                theme="light"
              />
            </div>
            {state.validationErrors.captcha && (
              <p className="mt-1 text-sm text-red-500 text-center">
                {state.validationErrors.captcha}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          data-testid="register-submit-btn"
          type="submit"
          disabled={state.verificationLoading || state.emailValid === false}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {state.verificationLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending verification...
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </form>
    </>
  );

  // Helper function to check password requirements
  const checkRequirement = (requirement, password) => {
    switch (requirement) {
      case `At least ${passwordRequirements.minLength} characters`:
        return password.length >= passwordRequirements.minLength;
      case 'One uppercase letter':
        return passwordRequirements.hasUpperCase.test(password);
      case 'One lowercase letter':
        return passwordRequirements.hasLowerCase.test(password);
      case 'One number':
        return passwordRequirements.hasNumbers.test(password);
      case 'One special character':
        return passwordRequirements.hasSpecialChar.test(password);
      case 'No spaces':
        return passwordRequirements.noSpaces.test(password);
      default:
        return false;
    }
  };

  // Render Step 3: Email verification
  const renderVerification = () => (
    <>
      <div className="mb-6 text-center">
        <Mail className="w-12 h-12 text-sky-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
        <p className="text-gray-600">
          We've sent a 6-digit code to <span className="font-semibold">{formData.email}</span>
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="6"
            value={state.verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setState(prev => ({ ...prev, verificationCode: value }));
            }}
            className="w-full text-center text-2xl tracking-widest py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
            placeholder="000000"
            required
            autoFocus
          />
          <p className="mt-2 text-sm text-gray-500 text-center">
            Enter the 6-digit code from your email
          </p>

          {state.remainingAttempts < 3 && (
            <p className="mt-2 text-sm text-yellow-600 text-center">
              Remaining attempts: {state.remainingAttempts}
            </p>
          )}
        </div>

        <button
          onClick={verifyEmailCode}
          disabled={state.verificationLoading || !state.verificationCode || state.verificationCode.length !== 6}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {state.verificationLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </button>

        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={resendVerificationCode}
            disabled={state.remainingAttempts <= 0}
            className="text-sm text-sky-600 hover:text-sky-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Didn't receive the code? Resend {state.remainingAttempts > 0 && `(${state.remainingAttempts} left)`}
          </button>

          <button
            type="button"
            onClick={() => setState(prev => ({ ...prev, step: 2 }))}
            className="block text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to details
          </button>
        </div>
      </div>
    </>
  );

  // Render Step 4: Success
  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your account has been created successfully.
          {formData.role === 'instructor'
            ? ' Please wait for admin approval to start creating courses.'
            : ' You can now start learning!'}
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
        >
          Continue to Login
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full py-2 text-sky-600 hover:text-sky-700 font-medium"
        >
          Back to Homepage
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Progress Steps */}
          {state.step < 4 && (
            <div className="flex justify-center mb-8">
              <div className="flex items-center">
                {[1, 2, 3].map((stepNum) => (
                  <React.Fragment key={stepNum}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${state.step >= stepNum ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                      {stepNum}
                    </div>
                    {stepNum < 3 && (
                      <div className={`w-12 h-1 mx-2 ${state.step > stepNum ? 'bg-sky-600' : 'bg-gray-200'
                        }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <GraduationCap className="w-10 h-10 text-sky-600" />
              <Shield className="w-5 h-5 text-green-500 absolute -top-1 -right-1" />
            </div>
            <span className="ml-2 text-xl font-bold">EduPlatform</span>
          </div>

          {/* Render current step */}
          {state.step === 1 && renderRoleSelection()}
          {state.step === 2 && renderRegistrationForm()}
          {state.step === 3 && renderVerification()}
          {state.step === 4 && renderSuccess()}

          {/* Footer */}
          {state.step === 1 && (
            <div className="mt-8 space-y-4">
              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-sky-600 font-medium hover:text-sky-700 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Security info */}
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Shield className="w-3 h-3 mr-1" />
                <span>Your data is protected with end-to-end encryption</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Register;