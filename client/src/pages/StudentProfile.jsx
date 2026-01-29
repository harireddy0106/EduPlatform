// client/src/pages/StudentProfile.jsx
import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
    User, Mail, Phone, Calendar, MapPin, BookOpen, GraduationCap,
    Award, Globe, Linkedin, Github, FileText, Settings, Shield,
    Moon, Sun, Bell, Lock, Camera, Upload, X, Save, CheckCircle,
    Loader2, Eye, Trash2, UploadCloud, Download, Menu, ArrowLeft,
    Target, Clock, Languages, Filter, Briefcase, Award as AwardIcon
} from 'lucide-react';
import DOMPurify from 'dompurify';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Validation schemas
const VALIDATION_SCHEMA = {
    basic: {
        name: { required: true, minLength: 2, message: "Full name is required" },
        phone: { required: true, pattern: /^\+?[\d\s-]{10,}$/, message: "Valid phone number is required" },
        location: { required: true, minLength: 2, message: "Location is required" }
    },
    academic: {
        education_level: { required: true, message: "Education level is required" },
        current_skill_level: { required: true, message: "Current skill level is required" },
        skills_interested_in: { required: true, minItems: 1, message: "At least one skill interest is required" }
    },
    social: {
        resume: { required: false, message: "Resume is optional but recommended" }
    }
};

// Section configuration
const SECTIONS = [
    { id: 'basic', label: 'Basic Information', icon: User, required: true },
    { id: 'academic', label: 'Academic & Learning', icon: GraduationCap, required: true },
    { id: 'preferences', label: 'Preferences', icon: Settings, required: false },
    { id: 'social', label: 'Social & Professional', icon: Globe, required: false },
    { id: 'settings', label: 'Settings', icon: Shield, required: false }
];

// Custom hook for form validation
const useFormValidation = (formData, activeTab) => {
    const validateSection = useCallback(() => {
        const errors = [];
        const schema = VALIDATION_SCHEMA[activeTab];

        if (!schema) return errors;

        Object.keys(schema).forEach(field => {
            const rules = schema[field];
            let value;

            // Handle array fields
            if (field === 'skills_interested_in' || field === 'preferred_categories') {
                value = formData[field] || [];
            } else if (field.includes('.')) {
                // Handle nested fields
                const [parent, child] = field.split('.');
                value = formData[parent]?.[child] || '';
            } else {
                value = formData[field] || '';
            }

            // Check required
            if (rules.required) {
                if (Array.isArray(value)) {
                    if (value.length === 0 || (value.length === 1 && !value[0])) {
                        errors.push(rules.message);
                    }
                } else if (!value.toString().trim()) {
                    errors.push(rules.message);
                }
            }

            // Check minLength
            if (rules.minLength && value.toString().trim().length < rules.minLength) {
                errors.push(rules.message);
            }

            // Check pattern
            if (rules.pattern && value.toString().trim() && !rules.pattern.test(value)) {
                errors.push(rules.message);
            }

            // Check minItems for arrays
            if (rules.minItems && Array.isArray(value) && value.length < rules.minItems) {
                errors.push(rules.message);
            }
        });

        return errors;
    }, [formData, activeTab]);

    return validateSection;
};

// Custom hook for calculating profile completion
const useProfileCompletion = (formData) => {
    const calculateCompletion = useCallback(() => {
        const requiredFields = [
            { field: 'name', section: 'basic' },
            { field: 'phone', section: 'basic' },
            { field: 'location', section: 'basic' },
            { field: 'education_level', section: 'academic' },
            { field: 'current_skill_level', section: 'academic' },
            { field: 'skills_interested_in', section: 'academic' }
        ];

        let completed = 0;

        requiredFields.forEach(({ field, section }) => {
            const value = formData[field];

            if (Array.isArray(value)) {
                if (value.length > 0 && value[0].trim()) completed++;
            } else if (value && value.toString().trim()) {
                completed++;
            }
        });

        // Calculate percentage (add 30% base for having a profile)
        const basePercentage = 30;
        const calculatedPercentage = Math.round((completed / requiredFields.length) * 70);
        return Math.min(basePercentage + calculatedPercentage, 100);
    }, [formData]);

    return calculateCompletion();
};

const StudentProfile = () => {
    const { user, updateUserProfile, changePassword } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Initialize active tab from URL or default to 'basic'
    const initialTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(initialTab && SECTIONS.some(s => s.id === initialTab) ? initialTab : 'basic');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
    const [profileStats, setProfileStats] = useState({
        courses_enrolled: 0,
        completion_rate: 0,
        hours_learned: 0,
        achievements: 0
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords don't match");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        setPasswordLoading(true);
        try {
            const success = await changePassword(passwordData.currentPassword, passwordData.newPassword);
            if (success) {
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                toast.success("Password updated successfully");
            }
        } catch (error) {
            console.error("Password update error:", error);
            // toast is likely handled in changePassword, but just in case
        } finally {
            setPasswordLoading(false);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        // Basic
        name: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        location: '',
        country: '',
        avatar: '',

        // Academic
        education_level: '',
        field_of_study: '',
        skills_interested_in: [],
        current_skill_level: '',
        learning_goals: '',
        certifications: [],

        // Preferences
        preferred_categories: [],
        learning_mode: 'video',
        daily_learning_time: '',
        language_preference: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

        // Social
        linkedin: '',
        github: '',
        portfolio: '',
        resume: '',
        resume_name: '',
        cover_letter: '',
        cover_letter_name: '',

        // Settings
        notification_preferences: {
            email_alerts: true,
            course_updates: true,
            promotions: false,
            assignment_deadlines: true,
            instructor_announcements: true
        },
        privacy_settings: {
            profile_visibility: 'public',
            show_progress: true,
            show_achievements: true,
            allow_messaging: true
        },
        theme_preference: 'system',
        accessibility_preferences: {
            reduced_motion: false,
            high_contrast: false,
            larger_text: false
        }
    });

    const fileInputRef = useRef(null);
    const resumeInputRef = useRef(null);
    const coverLetterInputRef = useRef(null);

    // Profile completion percentage
    const completionPercentage = useProfileCompletion(formData);

    // Validation hook
    const validateSection = useFormValidation(formData, activeTab);

    // Sanitize input
    const sanitizeInput = (input) => {
        if (typeof input === 'string') {
            return DOMPurify.sanitize(input.trim());
        }
        return input;
    };

    // Handle API errors
    const handleApiError = useCallback((error, customMessage = '') => {
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    toast.error('Session expired. Please login again.');
                    navigate('/login');
                    break;
                case 403:
                    toast.error('You do not have permission to perform this action.');
                    break;
                case 413:
                    toast.error('File too large. Please upload a smaller file.');
                    break;
                case 422:
                    toast.error(error.response.data?.errors?.[0]?.msg || 'Validation failed');
                    break;
                default:
                    toast.error(customMessage || error.response.data?.message || 'An error occurred');
            }
        } else if (error.request) {
            toast.error('Network error. Please check your connection.');
        } else {
            toast.error(customMessage || 'An unexpected error occurred.');
        }
        console.error('API Error:', error);
    }, [navigate]);

    // Fetch Profile Data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;

            try {
                setIsLoading(true);

                // Fetch from API first
                const response = await axios.get(`${API}/students/${user.id}/profile`);
                let data = response.data.data;
                let mergedData = {};

                if (response.data.success && data) {
                    // Merge API data
                    mergedData = {
                        ...data,
                        notification_preferences: {
                            ...(formData.notification_preferences || {}),
                            ...(data.notification_preferences || {})
                        },
                        privacy_settings: {
                            ...(formData.privacy_settings || {}),
                            ...(data.privacy_settings || {})
                        },
                        accessibility_preferences: {
                            ...(formData.accessibility_preferences || {}),
                            ...(data.accessibility_preferences || {})
                        }
                    };

                    // Check for first-time login / incomplete profile
                    if (!data.profile_completed || data.profile_completed === false) {
                        setShowOnboardingModal(true);
                    }
                }

                // Load from localStorage as overlay (to restore unsaved changes)
                const savedData = localStorage.getItem(`studentProfileDraft_${user.id}`);
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    // Merge draft on top of server data
                    mergedData = { ...mergedData, ...parsedData };
                    if (Object.keys(parsedData).length > 0) {
                        toast.info("Restored Unsaved Changes", {
                            description: "We've restored your unsaved profile changes from your last session."
                        });
                    }
                }

                if (Object.keys(mergedData).length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        ...mergedData
                    }));
                }

                // Fetch profile stats
                const statsResponse = await axios.get(`${API}/students/${user.id}/stats`);
                if (statsResponse.data.success) {
                    setProfileStats(statsResponse.data.data);
                }

            } catch (error) {
                handleApiError(error, 'Failed to load profile data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [user?.id, handleApiError]);

    // Auto-save to localStorage
    useEffect(() => {
        if (!user?.id || showOnboardingModal) return;

        const timer = setTimeout(() => {
            localStorage.setItem(
                `studentProfileDraft_${user.id}`,
                JSON.stringify(formData)
            );
        }, 3000);

        return () => clearTimeout(timer);
    }, [formData, user?.id, showOnboardingModal]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const sanitizedValue = type === 'checkbox' ? checked : sanitizeInput(value);

        setFormData(prev => ({
            ...prev,
            [name]: sanitizedValue
        }));
    };

    const handleNestedChange = (section, field, value) => {
        const sanitizedValue = typeof value === 'boolean' ? value : sanitizeInput(value);

        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: sanitizedValue
            }
        }));
    };

    const handleArrayChange = (field, value) => {
        const items = value.split(',').map(s => sanitizeInput(s.trim())).filter(s => s);
        setFormData(prev => ({ ...prev, [field]: items }));
    };

    const handleFileUpload = async (e, field, fileNameField) => {
        const file = e.target.files[0];
        if (!file) return;

        // File validation
        const maxSize = field === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File too large. Max size is ${maxSize / (1024 * 1024)}MB`);
            return;
        }

        const allowedTypes = {
            'avatar': ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
            'resume': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'cover_letter': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        };

        const fieldType = field;
        if (allowedTypes[fieldType] && !allowedTypes[fieldType].includes(file.type)) {
            toast.error(`Invalid file type. Allowed: ${allowedTypes[fieldType].map(t => t.split('/')[1]).join(', ')}`);
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('context', field === 'avatar' ? 'profile_picture' : field);
        formDataUpload.append('contextId', user.id);
        formDataUpload.append('section', activeTab);

        try {
            setIsSaving(true);
            setUploadProgress(prev => ({ ...prev, [field]: 0 }));

            const response = await axios.post(`${API}/upload`, formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                timeout: 300000,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(prev => ({ ...prev, [field]: percent }));
                    }
                }
            });

            if (response.data.success) {
                const url = response.data.data.url;

                if (field === 'avatar') {
                    await updateUserProfile({ avatar: url });
                    setFormData(prev => ({ ...prev, avatar: url }));
                    toast.success("Profile picture updated");
                } else {
                    setFormData(prev => ({
                        ...prev,
                        [field]: url,
                        [fileNameField]: file.name
                    }));
                    toast.success(`${field.replace('_', ' ')} uploaded successfully`);
                }

                // Auto-save after upload
                await handleSubmit(null, true);
            }
        } catch (error) {
            handleApiError(error, 'Upload failed');
        } finally {
            setIsSaving(false);
            setUploadProgress(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleSubmit = async (e, isAutoSave = false) => {
        if (e) e.preventDefault();

        if (!isAutoSave) {
            const validationErrors = validateSection();
            if (validationErrors.length > 0) {
                toast.error(validationErrors[0]);
                return;
            }
        }

        setIsSaving(true);
        if (!isAutoSave) {
            setAutoSaveStatus('saving');
        }

        try {
            const profileData = {
                ...formData,
                profile_completed: completionPercentage >= 80,
                last_updated: new Date().toISOString()
            };

            const response = await axios.put(
                `${API}/students/${user.id}/profile`,
                profileData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.data.success) {
                if (!isAutoSave) {
                    toast.success('Profile updated successfully!');
                    setAutoSaveStatus('saved');

                    // Clear localStorage after successful save
                    localStorage.removeItem(`studentProfileDraft_${user.id}`);

                    // Update user context
                    if (formData.name !== user.name || formData.avatar !== user.avatar) {
                        await updateUserProfile({
                            name: formData.name,
                            avatar: formData.avatar || user.avatar
                        });
                    }
                }
            }
        } catch (error) {
            handleApiError(error, 'Failed to update profile');
            if (!isAutoSave) {
                setAutoSaveStatus('error');
            }
        } finally {
            setIsSaving(false);
            if (!isAutoSave) {
                setTimeout(() => setAutoSaveStatus('idle'), 3000);
            }
        }
    };

    const handleSkipOnboarding = async () => {
        try {
            await axios.put(`${API}/students/${user.id}/skip-profile`);
            localStorage.removeItem(`studentProfileDraft_${user.id}`);
            setShowOnboardingModal(false);
            navigate('/dashboard');
        } catch (error) {
            handleApiError(error, 'Failed to skip profile setup');
        }
    };

    // Export profile
    const exportProfile = () => {
        const dataStr = JSON.stringify(formData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `student-profile-${user.id}-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);

        toast.success('Profile exported successfully');
    };

    // Import profile
    const importProfile = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                setFormData(importedData);
                toast.success('Profile imported successfully');
            } catch (error) {
                toast.error('Invalid profile file format');
            }
        };
        reader.readAsText(file);
    };

    // Render file upload with progress
    const renderFileUpload = (label, field, fileNameField, accept, buttonLabel = 'Upload') => {
        const fileUrl = formData[field] || '';
        const fileName = formData[fileNameField] || '';
        const progress = uploadProgress[field];

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="file"
                                onChange={(e) => handleFileUpload(e, field, fileNameField)}
                                accept={accept}
                                className="hidden"
                                disabled={isSaving}
                            />
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-400 transition-colors flex flex-col items-center justify-center">
                                <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">
                                    {buttonLabel} or drag and drop
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    {accept.includes('image') ? 'Images' : accept.includes('video') ? 'Videos' : 'Documents'}
                                </span>
                            </div>
                        </label>

                        {fileUrl && (
                            <div className="flex items-center gap-2">
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                    title="View Document"
                                >
                                    <Eye className="w-5 h-5" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            [field]: '',
                                            [fileNameField]: ''
                                        }));
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Remove File"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {progress !== undefined && progress !== null && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}

                    {fileName && (
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 font-medium truncate" title={fileName}>
                                {fileName}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border"
            >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sidebar */}
            <div className={`
                w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 pt-20 pb-10 overflow-y-auto
                transition-transform duration-300 z-40
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="px-6 mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600 transition-colors mb-4 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">Student Profile</h2>
                    <p className="text-sm text-gray-500 mt-1 mb-3">Manage your learning profile</p>

                    {/* Profile Completion */}
                    <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1">Profile Completion</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${completionPercentage}%` }}
                            ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {completionPercentage}% Complete
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <div className="text-xs text-blue-600">Courses</div>
                            <div className="text-lg font-bold text-blue-700">{profileStats.courses_enrolled}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg">
                            <div className="text-xs text-green-600">Progress</div>
                            <div className="text-lg font-bold text-green-700">{profileStats.completion_rate}%</div>
                        </div>
                    </div>
                </div>

                <nav className="space-y-1" role="tablist" aria-label="Profile sections">
                    {SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const isCompleted = section.required ?
                            completionPercentage >= (SECTIONS.indexOf(section) + 1) * 15 : true;

                        return (
                            <button
                                key={section.id}
                                onClick={() => {
                                    setActiveTab(section.id);
                                    setSidebarOpen(false);
                                }}
                                role="tab"
                                aria-selected={activeTab === section.id}
                                aria-controls={`${section.id}-panel`}
                                id={`${section.id}-tab`}
                                className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === section.id
                                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 mr-3 ${activeTab === section.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                {section.label}
                                {section.required && (
                                    <span className={`absolute right-4 w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Import/Export Buttons */}
                <div className="px-6 mt-8 space-y-2">
                    <button
                        onClick={exportProfile}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Profile
                    </button>
                    <label className="w-full flex items-center justify-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Profile
                        <input
                            type="file"
                            accept=".json"
                            onChange={importProfile}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-24">
                {/* Header / Banner */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
                    <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-700 relative">
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full border-4 border-white bg-indigo-100 overflow-hidden shadow-lg flex items-center justify-center">
                                    {formData.avatar || user?.avatar ? (
                                        <img
                                            src={formData.avatar || user.avatar}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`;
                                            }}
                                        />
                                    ) : (
                                        <span className="text-4xl font-bold text-indigo-600">{formData.name?.charAt(0) || 'U'}</span>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition cursor-pointer">
                                    <Camera className="w-4 h-4" />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'avatar', 'avatar_name')}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 pb-6 px-8">
                        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-4">
                            <div className="text-center lg:text-left">
                                <h1 className="text-3xl font-bold text-gray-900">{formData.name}</h1>
                                <p className="text-gray-500 font-medium">{user?.email}</p>
                                <div className="flex items-center justify-center lg:justify-start gap-4 mt-2 text-sm text-gray-600">
                                    {formData.location && (
                                        <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {formData.location}</span>
                                    )}
                                    {formData.education_level && (
                                        <span className="flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                            {formData.education_level}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Auto-save Status */}
                                {autoSaveStatus === 'saving' && (
                                    <div className="flex items-center text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Saving...
                                    </div>
                                )}
                                {autoSaveStatus === 'saved' && (
                                    <div className="flex items-center text-sm text-green-600">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Saved
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                    className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Form Content */}
                <div className="bg-white rounded-xl shadow-sm border p-6 lg:p-8">
                    <form onSubmit={handleSubmit}>
                        {/* Basic Information */}
                        {activeTab === 'basic' && (
                            <div role="tabpanel" id="basic-panel" aria-labelledby="basic-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Basic Information</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email <span className="text-xs text-gray-500">(Read-only)</span>
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={user?.email}
                                                    readOnly
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="+91 98765 43210"
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="date"
                                                    name="date_of_birth"
                                                    value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                            <select
                                                name="gender"
                                                value={formData.gender || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="non_binary">Non-binary</option>
                                                <option value="other">Other</option>
                                                <option value="prefer_not_to_say">Prefer not to say</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Location / Country <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="location"
                                                    value={formData.location || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="City, Country"
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Academic Info */}
                        {activeTab === 'academic' && (
                            <div role="tabpanel" id="academic-panel" aria-labelledby="academic-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Academic & Learning Info</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Education Level <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="education_level"
                                                value={formData.education_level || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                required
                                            >
                                                <option value="">Select Level</option>
                                                <option value="high_school">High School</option>
                                                <option value="diploma">Diploma</option>
                                                <option value="undergraduate">Undergraduate (UG)</option>
                                                <option value="postgraduate">Postgraduate (PG)</option>
                                                <option value="phd">PhD</option>
                                                <option value="professional">Professional</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                                            <input
                                                type="text"
                                                name="field_of_study"
                                                value={formData.field_of_study || ''}
                                                onChange={handleInputChange}
                                                placeholder="Computer Science, Business, etc."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Skills Interested In (Comma separated) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.skills_interested_in?.join(', ') || ''}
                                                onChange={(e) => handleArrayChange('skills_interested_in', e.target.value)}
                                                placeholder="Python, React, Marketing, Design..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Separate multiple skills with commas
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Skill Level <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="current_skill_level"
                                                value={formData.current_skill_level || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                required
                                            >
                                                <option value="">Select Level</option>
                                                <option value="beginner">Beginner</option>
                                                <option value="intermediate">Intermediate</option>
                                                <option value="advanced">Advanced</option>
                                                <option value="expert">Expert</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                            <select
                                                name="timezone"
                                                value={formData.timezone || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            >
                                                <option value="UTC">UTC</option>
                                                <option value="America/New_York">Eastern Time (ET)</option>
                                                <option value="America/Chicago">Central Time (CT)</option>
                                                <option value="America/Denver">Mountain Time (MT)</option>
                                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                                <option value="Europe/London">London (GMT)</option>
                                                <option value="Europe/Paris">Paris (CET)</option>
                                                <option value="Asia/Kolkata">India (IST)</option>
                                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                                                <option value="Australia/Sydney">Sydney (AEST)</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Goals</label>
                                            <textarea
                                                name="learning_goals"
                                                value={formData.learning_goals || ''}
                                                onChange={handleInputChange}
                                                rows="4"
                                                placeholder="What do you hope to achieve? e.g., Land a job in web development, Start my own business, Learn data science fundamentals..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preferences */}
                        {activeTab === 'preferences' && (
                            <div role="tabpanel" id="preferences-panel" aria-labelledby="preferences-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Course Preferences</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Categories (Comma separated)</label>
                                            <input
                                                type="text"
                                                value={formData.preferred_categories?.join(', ') || ''}
                                                onChange={(e) => handleArrayChange('preferred_categories', e.target.value)}
                                                placeholder="Web Development, Data Science, Business, Design..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Learning Mode</label>
                                            <select
                                                name="learning_mode"
                                                value={formData.learning_mode || 'video'}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            >
                                                <option value="video">Video Lectures</option>
                                                <option value="live">Live Sessions</option>
                                                <option value="reading">Reading / Text</option>
                                                <option value="interactive">Interactive Exercises</option>
                                                <option value="mixed">Mixed Format</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Learning Time</label>
                                            <select
                                                name="daily_learning_time"
                                                value={formData.daily_learning_time || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            >
                                                <option value="">Select Time</option>
                                                <option value="15 mins">15 mins</option>
                                                <option value="30 mins">30 mins</option>
                                                <option value="1 hour">1 hour</option>
                                                <option value="2 hours">2 hours</option>
                                                <option value="3+ hours">3+ hours</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Language Preference</label>
                                            <input
                                                type="text"
                                                name="language_preference"
                                                value={formData.language_preference || ''}
                                                onChange={handleInputChange}
                                                placeholder="English, Spanish, Hindi, etc."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Social */}
                        {activeTab === 'social' && (
                            <div role="tabpanel" id="social-panel" aria-labelledby="social-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Social & Professional Links</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</label>
                                            <div className="relative">
                                                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="url"
                                                    name="linkedin"
                                                    value={formData.linkedin || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="https://linkedin.com/in/username"
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Profile</label>
                                            <div className="relative">
                                                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="url"
                                                    name="github"
                                                    value={formData.github || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="https://github.com/username"
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="url"
                                                    name="portfolio"
                                                    value={formData.portfolio || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="https://yourportfolio.com"
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resume Upload */}
                                    {renderFileUpload(
                                        'Resume / CV (PDF/DOC/DOCX)',
                                        'resume',
                                        'resume_name',
                                        '.pdf,.doc,.docx',
                                        'Upload Resume'
                                    )}

                                    {/* Cover Letter Upload */}
                                    {renderFileUpload(
                                        'Cover Letter (Optional)',
                                        'cover_letter',
                                        'cover_letter_name',
                                        '.pdf,.doc,.docx',
                                        'Upload Cover Letter'
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Settings */}
                        {activeTab === 'settings' && (
                            <div role="tabpanel" id="settings-panel" aria-labelledby="settings-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Settings</h2>

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-semibold text-gray-800 flex items-center mb-4">
                                                <Bell className="w-4 h-4 mr-2" /> Notification Preferences
                                            </h3>
                                            <div className="space-y-3 ml-6">
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Email Alerts</p>
                                                        <p className="text-xs text-gray-500">Important account notifications</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notification_preferences?.email_alerts}
                                                        onChange={(e) => handleNestedChange('notification_preferences', 'email_alerts', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Course Updates</p>
                                                        <p className="text-xs text-gray-500">New content, announcements</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notification_preferences?.course_updates}
                                                        onChange={(e) => handleNestedChange('notification_preferences', 'course_updates', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Assignment Deadlines</p>
                                                        <p className="text-xs text-gray-500">Reminders for upcoming deadlines</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notification_preferences?.assignment_deadlines}
                                                        onChange={(e) => handleNestedChange('notification_preferences', 'assignment_deadlines', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Promotional Emails</p>
                                                        <p className="text-xs text-gray-500">Discounts, new course launches</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notification_preferences?.promotions}
                                                        onChange={(e) => handleNestedChange('notification_preferences', 'promotions', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t">
                                            <h3 className="font-semibold text-gray-800 flex items-center mb-4">
                                                <Shield className="w-4 h-4 mr-2" /> Privacy Settings
                                            </h3>
                                            <div className="space-y-3 ml-6">
                                                <div className="p-3 border rounded-lg">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                                                    <select
                                                        value={formData.privacy_settings?.profile_visibility}
                                                        onChange={(e) => handleNestedChange('privacy_settings', 'profile_visibility', e.target.value)}
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                    >
                                                        <option value="public">Public - Anyone can view</option>
                                                        <option value="students">Students Only</option>
                                                        <option value="instructors">Instructors Only</option>
                                                        <option value="private">Private - Only Me</option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Show Learning Progress</p>
                                                        <p className="text-xs text-gray-500">Display your course progress publicly</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.privacy_settings?.show_progress}
                                                        onChange={(e) => handleNestedChange('privacy_settings', 'show_progress', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Allow Direct Messaging</p>
                                                        <p className="text-xs text-gray-500">Allow other users to message you</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.privacy_settings?.allow_messaging}
                                                        onChange={(e) => handleNestedChange('privacy_settings', 'allow_messaging', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t">
                                            <h3 className="font-semibold text-gray-800 flex items-center mb-4">
                                                <Lock className="w-4 h-4 mr-2" /> Security
                                            </h3>
                                            <div className="ml-6">
                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Change Password</h4>
                                                <div className="max-w-md space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                                        <input
                                                            type="password"
                                                            value={passwordData.currentPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                                        <input
                                                            type="password"
                                                            value={passwordData.newPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                                        <input
                                                            type="password"
                                                            value={passwordData.confirmPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handlePasswordChange}
                                                        disabled={passwordLoading}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center text-sm font-medium"
                                                    >
                                                        {passwordLoading ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            'Update Password'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t">
                                            <h3 className="font-semibold text-gray-800 flex items-center mb-4">
                                                <Settings className="w-4 h-4 mr-2" /> Accessibility
                                            </h3>
                                            <div className="space-y-3 ml-6">
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Reduce Motion</p>
                                                        <p className="text-xs text-gray-500">Minimize animations and transitions</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.accessibility_preferences?.reduced_motion}
                                                        onChange={(e) => handleNestedChange('accessibility_preferences', 'reduced_motion', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-700">High Contrast</p>
                                                        <p className="text-xs text-gray-500">Increase contrast for better readability</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.accessibility_preferences?.high_contrast}
                                                        onChange={(e) => handleNestedChange('accessibility_preferences', 'high_contrast', e.target.checked)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Onboarding Modal */}
            {showOnboardingModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-scaleIn relative">
                        <button
                            onClick={handleSkipOnboarding}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
                            <p className="text-gray-600 mt-2">
                                Welcome, {formData.name}! To give you the best learning experience and personalized recommendations, please take a moment to complete your profile.
                            </p>

                            {/* Progress indicator */}
                            <div className="mt-4">
                                <div className="text-xs text-gray-500 mb-1">Profile Completion</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${completionPercentage}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {completionPercentage}% Complete
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => setShowOnboardingModal(false)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                            >
                                Continue to Profile Setup
                            </button>
                            <button
                                onClick={handleSkipOnboarding}
                                className="w-full py-3 text-gray-500 hover:text-gray-800 font-medium transition"
                            >
                                Skip for now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProfile;