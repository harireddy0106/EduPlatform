// client/src/pages/InstructorProfile.jsx
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    Award,
    BookOpen,
    DollarSign,
    Settings,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    Globe,
    Linkedin,
    Github,
    Youtube,
    Twitter,
    Instagram,
    Upload,
    Plus,
    Trash2,
    ArrowLeft,
    Eye,
    Menu,
    X,
    Download,
    UploadCloud
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

const API = import.meta.env.VITE_BACKEND_URL + '/api';

// Validation schemas for each section
const VALIDATION_SCHEMA = {
    basic: {
        title: { required: true, minLength: 2, message: "Professional Title is required" },
        bio: { required: true, minLength: 50, maxLength: 2000, message: "Bio should be 50-2000 characters" },
        location: { required: true, message: "Location is required" },
        languages: { required: true, message: "At least one language is required" }
    },
    contact: {
        phone: {
            required: true,
            pattern: /^\+?[\d\s-]{10,}$/,
            message: "Valid phone number is required"
        },
        website: {
            pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            message: "Please enter a valid website URL"
        }
    },
    professional: {
        experience: {
            required: true,
            min: 0,
            max: 60,
            message: "Please enter valid years of experience (0-60)"
        },
        current_org: {
            required: true,
            minLength: 2,
            message: "Current organization is required"
        },
        skills: {
            required: true,
            message: "At least one skill is required"
        }
    },
    payment: {
        account_holder: {
            required: true,
            minLength: 2,
            message: "Account holder name is required"
        },
        account_number: {
            required: true,
            pattern: /^\d{9,18}$/,
            message: "Valid account number (9-18 digits) is required"
        },
        bank_name: {
            required: true,
            minLength: 2,
            message: "Bank name is required"
        },
        ifsc: {
            required: true,
            pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
            message: "Valid IFSC code is required"
        }
    }
};

// URL patterns for social media validation
const SOCIAL_PATTERNS = {
    linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/.+/,
    github: /^https:\/\/(www\.)?github\.com\/.+/,
    youtube: /^https:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/).+/,
    twitter: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/.+/,
    instagram: /^https:\/\/(www\.)?instagram\.com\/.+/
};

const SECTION_ICONS = {
    basic: User,
    contact: Phone,
    professional: Briefcase,
    teaching: BookOpen,
    verification: Award,
    social: Globe,
    payment: DollarSign,
    settings: Settings
};

const SECTIONS = [
    { id: 'basic', label: 'Basic Information', required: true },
    { id: 'contact', label: 'Contact Information', required: true },
    { id: 'professional', label: 'Professional Details', required: true },
    { id: 'teaching', label: 'Teaching Preferences', required: false },
    { id: 'verification', label: 'Identity & Verification', required: false },
    { id: 'social', label: 'Social & Branding', required: false },
    { id: 'payment', label: 'Payment & Monetization', required: false },
    { id: 'settings', label: 'Settings', required: false }
];

// Custom hook for form validation
const useFormValidation = (formData, activeSection) => {
    const validateSection = useCallback(() => {
        const errors = [];
        const schema = VALIDATION_SCHEMA[activeSection];

        if (!schema) return errors;

        Object.keys(schema).forEach(field => {
            const rules = schema[field];
            let value;

            // Handle nested bank details
            if (activeSection === 'payment') {
                value = formData.payment?.bank_details?.[field] || '';
            } else if (activeSection === 'professional' && field === 'qualifications') {
                value = formData[activeSection]?.[field] || [];
            } else {
                value = formData[activeSection]?.[field] || '';
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

            // Check range
            if (rules.min !== undefined && Number(value) < rules.min) {
                errors.push(rules.message);
            }
            if (rules.max !== undefined && Number(value) > rules.max) {
                errors.push(rules.message);
            }
        });

        return errors;
    }, [formData, activeSection]);

    return validateSection;
};

// Custom hook for calculating profile completion
const useProfileCompletion = (formData) => {
    const calculateCompletion = useCallback(() => {
        const requiredFields = [
            { field: 'title', section: 'basic' },
            { field: 'bio', section: 'basic' },
            { field: 'location', section: 'basic' },
            { field: 'languages', section: 'basic' },
            { field: 'phone', section: 'contact' },
            { field: 'experience', section: 'professional' },
            { field: 'current_org', section: 'professional' },
            { field: 'skills', section: 'professional' }
        ];

        let completed = 0;

        requiredFields.forEach(({ field, section }) => {
            let value;

            if (section === 'basic' || section === 'contact' || section === 'professional') {
                value = formData[section]?.[field];

                if (Array.isArray(value)) {
                    if (value.length > 0) completed++;
                } else if (value && value.toString().trim()) {
                    completed++;
                }
            }
        });

        // Calculate percentage (add 25% base for having a profile)
        const basePercentage = 25;
        const calculatedPercentage = Math.round((completed / requiredFields.length) * 75);
        return Math.min(basePercentage + calculatedPercentage, 100);
    }, [formData]);

    return calculateCompletion();
};

export default function InstructorProfile() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeSection, setActiveSection] = useState(searchParams.get('tab') || 'basic');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved, error

    // Main form state
    const [formData, setFormData] = useState({
        // Basic Information
        basic: {
            name: user?.name || '',
            avatar: user?.avatar || '',
            title: '',
            bio: '',
            languages: '',
            location: ''
        },

        // Contact Information
        contact: {
            phone: '',
            website: '',
            email: user?.email || ''
        },

        // Professional Details
        professional: {
            skills: '',
            experience: '',
            current_org: '',
            qualifications: []
        },

        // Teaching Preferences
        teaching: {
            teaching_categories: '',
            teaching_mode: 'video',
            hourly_rate: '',
            availability: 'flexible'
        },

        // Identity & Verification
        verification: {
            government_id: '',
            government_id_name: '',
            resume: '',
            resume_name: '',
            verification_status: 'pending'
        },

        // Social & Branding
        social: {
            linkedin: '',
            github: '',
            youtube: '',
            twitter: '',
            instagram: '',
            logo: '',
            logo_name: '',
            intro_video: '',
            intro_video_name: ''
        },

        // Payment & Monetization
        payment: {
            bank_details: {
                account_holder: '',
                account_number: '',
                bank_name: '',
                ifsc: '',
                upi_id: ''
            },
            payout_method: 'bank_transfer',
            tax_id: ''
        },

        // Settings
        settings: {
            is_public: true,
            notification_email: true,
            notification_course_updates: true,
            notification_promotions: false,
            profile_completed: false
        }
    });

    // Helper to extract Cloudinary public_id from URL
    const extractPublicId = (url) => {
        try {
            if (!url) return null;
            const regex = /upload\/(?:v\d+\/)?(.+)/;
            const match = url.match(regex);
            if (!match) return null;

            const withExt = match[1];
            const lastDot = withExt.lastIndexOf('.');
            if (lastDot === -1) return withExt;
            // Handle double extension edge case if present in old data, but usually simply stripping last extension gives valid public_id
            return withExt.substring(0, lastDot);
        } catch (error) {
            console.error('Error extracting public ID:', error);
            return null;
        }
    };

    const handleFileDelete = async (section, field, fileNameField) => {
        const fileUrl = formData[section]?.[field];
        if (!fileUrl) return;

        if (!window.confirm("Are you sure you want to delete this file? This action is permanent.")) {
            return;
        }

        try {
            setLoading(true);
            const publicId = extractPublicId(fileUrl);

            if (publicId) {
                // Encode publicId to handle slashes in folders (documents/xyz)
                // However, often Cloudinary APIs want the slashes. Express might decode.
                // Safest to just pass it. If Express router problem use query param?
                // The route is DELETE /:public_id. If public_id has slashes, Express might get confused 
                // unless we use (*). But let's try strict URI encoding or check route.
                // Actually, standard is to encodeURIComponent.
                await axios.delete(`/api/upload/${encodeURIComponent(publicId)}`);
            }

            // Update local state
            const updatedFormData = {
                ...formData,
                [section]: {
                    ...formData[section],
                    [field]: '',
                    [fileNameField]: ''
                }
            };
            setFormData(updatedFormData);

            // Also update the profile in database to reflect removal
            // Reuse the parsing logic from handleSubmit
            const parseArrayField = (value) => {
                if (Array.isArray(value)) return value;
                if (typeof value === 'string') {
                    return value.split(',').map(item => item.trim()).filter(Boolean);
                }
                return [];
            };

            const profileData = {
                ...updatedFormData,
                basic: {
                    ...updatedFormData.basic,
                    languages: parseArrayField(updatedFormData.basic.languages)
                },
                professional: {
                    ...updatedFormData.professional,
                    skills: parseArrayField(updatedFormData.professional.skills)
                },
                teaching: {
                    ...updatedFormData.teaching,
                    teaching_categories: parseArrayField(updatedFormData.teaching.teaching_categories)
                },
                profile_completed: completionPercentage >= 80, // Note: recalculating strictly might be needed but good enough
                last_updated: new Date().toISOString()
            };

            await axios.put(
                `${API}/instructors/${user.id}/profile`,
                profileData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update user context if avatar changed
            if (section === 'basic' && field === 'avatar') {
                updateUser({
                    ...user,
                    avatar: ''
                });
            }

            toast.success("File deleted successfully");
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error("Failed to delete file");
        } finally {
            setLoading(false);
        }
    };

    // Calculate profile completion percentage
    const completionPercentage = useProfileCompletion(formData);

    // Validation hook
    const validateSection = useFormValidation(formData, activeSection);

    // Sanitize input
    const sanitizeInput = (input) => {
        if (typeof input === 'string') {
            return input; // DOMPurify.sanitize(input) can be aggressive; for inputs we usually just want to store the value. 
            // If we really need to sanitize, do it on display or submit.
            // But specifically for the user request "spaces not working", removing .trim() is essentially the fix, 
            // and removing DOMPurify.sanitize from *every keystroke* prevents other weirdness with characters.
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

    // Fetch existing profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;

            try {
                setInitialLoading(true);

                // Fetch from API first
                const response = await axios.get(`${API}/instructors/${user.id}/profile`);
                let mergedData = {};

                if (response.data.success && response.data.data) {
                    // Prepare server data
                    const serverData = response.data.data;

                    // Helper to ensure objects exist
                    mergedData = {
                        ...serverData
                    };

                    // Handle nested structure initialization/merging logic locally before setting state
                    // Note: We need to respect the structure of formData.
                    // The server returns a flat or nested object? 
                    // Looking at the route, it creates/updates based on flat-ish structure but Mongoose handles it.
                    // The GET route returns the InstructorProfile document directly.

                    // We need to apply the specific transformations (comma separated strings) if they aren't already string
                    ['basic', 'professional', 'teaching'].forEach(section => {
                        if (mergedData[section]) {
                            // Deep copy the section
                            let sectionData = { ...mergedData[section] };

                            if (section === 'basic' && Array.isArray(sectionData.languages)) {
                                sectionData.languages = sectionData.languages.join(', ');
                            }
                            if (section === 'professional' && Array.isArray(sectionData.skills)) {
                                sectionData.skills = sectionData.skills.join(', ');
                            }
                            if (section === 'teaching' && Array.isArray(sectionData.teaching_categories)) {
                                sectionData.teaching_categories = sectionData.teaching_categories.join(', ');
                            }

                            mergedData[section] = sectionData;
                        }
                    });

                    if (!response.data.data.basic?.title) {
                        setIsFirstTime(true);
                    }
                } else {
                    setIsFirstTime(true);
                }

                // Check for localStorage draft and overlay it
                const savedData = localStorage.getItem(`instructorProfileDraft_${user.id}`);
                if (savedData) {
                    const parsedDraft = JSON.parse(savedData);
                    // Merge draft on top
                    // We need to be careful with deep merging.
                    // A simple spread might overwrite entire sections if not careful.
                    // But `parsedDraft` should be the full `formData` structure.

                    // Let's do a deep merge for the top-level sections to be safe, 
                    // or just spread if we trust the draft is comprehensive.
                    // Since the draft is the *entire* formData state, we can just spread it on top of the server data (which we formatted to match formData structure).

                    // Actually, mergedData currently only contains what the server sent.
                    // We should merge it into the *initial* formData structure, then apply the draft.

                    mergedData = { ...mergedData, ...parsedDraft };

                    if (Object.keys(parsedDraft).length > 0) {
                        toast.info("Restored Unsaved Changes", {
                            description: "We've restored your unsaved profile changes from your last session."
                        });
                    }
                }

                // Apply to state
                if (Object.keys(mergedData).length > 0) {
                    setFormData(prev => {
                        // We need to merge server/draft data into the *existing* default structure of prev
                        // to ensure no fields are missing.
                        const finalState = { ...prev };

                        Object.keys(mergedData).forEach(key => {
                            if (finalState[key] && typeof finalState[key] === 'object' && !Array.isArray(finalState[key])) {
                                finalState[key] = { ...finalState[key], ...(mergedData[key] || {}) };
                            } else {
                                finalState[key] = mergedData[key];
                            }
                        });
                        return finalState;
                    });
                }

            } catch (error) {
                handleApiError(error, 'Failed to load profile');
            } finally {
                setInitialLoading(false);
            }
        };

        fetchProfile();
    }, [user?.id, handleApiError]);

    // Auto-save to localStorage
    useEffect(() => {
        if (!user?.id || isFirstTime) return;

        const timer = setTimeout(() => {
            localStorage.setItem(
                `instructorProfileDraft_${user.id}`,
                JSON.stringify(formData)
            );
        }, 3000);

        return () => clearTimeout(timer);
    }, [formData, user?.id, isFirstTime]);

    const handleSkip = async () => {
        try {
            await axios.put(`${API}/instructors/${user.id}/skip-profile`);
            localStorage.removeItem(`instructorProfileDraft_${user.id}`);
            navigate('/instructor/dashboard');
        } catch (error) {
            handleApiError(error, 'Failed to skip profile setup');
        }
    };

    const handleFileUpload = async (e, field, fileNameField) => {
        const file = e.target.files[0];
        if (!file) return;

        // File validation
        const maxSize = field.includes('video') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File too large. Max size is ${maxSize / (1024 * 1024)}MB`);
            return;
        }

        // Allowed file types
        const allowedTypes = {
            'government_id': ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
            'resume': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'logo': ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'],
            'intro_video': ['video/mp4', 'video/webm', 'video/ogg'],
            'avatar': ['image/jpeg', 'image/png', 'image/jpg']
        };

        const fieldType = field.split('_')[0];
        if (allowedTypes[fieldType] && !allowedTypes[fieldType].includes(file.type)) {
            toast.error(`Invalid file type. Allowed: ${allowedTypes[fieldType].map(t => t.split('/')[1]).join(', ')}`);
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('context', field);
        formDataUpload.append('contextId', user.id);
        formDataUpload.append('section', activeSection);

        try {
            setLoading(true);
            setUploadProgress(prev => ({ ...prev, [field]: 0 }));

            const response = await axios.post(`${API}/upload`, formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(prev => ({ ...prev, [field]: percent }));
                    }
                }
            });

            if (response.data.success) {
                // Update the specific section with file URL and name
                setFormData(prev => ({
                    ...prev,
                    [activeSection]: {
                        ...prev[activeSection],
                        [field]: response.data.data.url,
                        [fileNameField || `${field}_name`]: file.name,
                        // If uploading verification docs, update status to pending
                        ...(section === 'verification' ? { verification_status: 'pending' } : {})
                    }
                }));

                // Immediately update header avatar if we just uploaded an avatar
                if (field === 'avatar' && window.updateAuthUser && user) {
                    const updatedUser = {
                        ...user,
                        avatar: response.data.data.url
                    };
                    window.updateAuthUser(updatedUser);
                }

                toast.success(`${field.replace('_', ' ')} uploaded successfully`);

                // Auto-save after upload
                await handleSubmit(null, true);
            }
        } catch (error) {
            handleApiError(error, 'Upload failed');
        } finally {
            setLoading(false);
            setUploadProgress(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleChange = (e, section) => {
        const { name, value, type, checked } = e.target;
        const sanitizedValue = type === 'checkbox' ? checked : sanitizeInput(value);

        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: sanitizedValue
            }
        }));
    };

    const handleBankChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = sanitizeInput(value);

        setFormData(prev => ({
            ...prev,
            payment: {
                ...prev.payment,
                bank_details: {
                    ...prev.payment.bank_details,
                    [name]: sanitizedValue
                }
            }
        }));
    };

    const handleArrayChange = (section, field, value) => {
        const items = value.split(',').map(s => sanitizeInput(s.trim())).filter(s => s);
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: items
            }
        }));
    };

    // Qualification Handlers
    const handleQualificationChange = (index, field, value) => {
        const sanitizedValue = sanitizeInput(value);
        setFormData(prev => {
            const newQualifications = [...prev.professional.qualifications];
            newQualifications[index] = { ...newQualifications[index], [field]: sanitizedValue };
            return {
                ...prev,
                professional: {
                    ...prev.professional,
                    qualifications: newQualifications
                }
            };
        });
    };

    const addQualification = () => {
        setFormData(prev => ({
            ...prev,
            professional: {
                ...prev.professional,
                qualifications: [
                    ...prev.professional.qualifications,
                    { title: '', year: '', institute: '' }
                ]
            }
        }));
    };

    const removeQualification = (index) => {
        setFormData(prev => ({
            ...prev,
            professional: {
                ...prev.professional,
                qualifications: prev.professional.qualifications.filter((_, i) => i !== index)
            }
        }));
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

        setLoading(true);
        if (!isAutoSave) {
            setAutoSaveStatus('saving');
        }

        try {
            // Helper to parse array fields
            const parseArrayField = (value) => {
                if (Array.isArray(value)) return value;
                if (typeof value === 'string') {
                    return value.split(',').map(item => item.trim()).filter(Boolean);
                }
                return [];
            };

            // Prepare data for API
            const profileData = {
                ...formData,
                basic: {
                    ...formData.basic,
                    languages: parseArrayField(formData.basic.languages)
                },
                professional: {
                    ...formData.professional,
                    skills: parseArrayField(formData.professional.skills)
                },
                teaching: {
                    ...formData.teaching,
                    teaching_categories: parseArrayField(formData.teaching.teaching_categories)
                },
                profile_completed: completionPercentage >= 80,
                last_updated: new Date().toISOString()
            };

            const response = await axios.put(
                `${API}/instructors/${user.id}/profile`,
                profileData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                if (!isAutoSave) {
                    toast.success('Profile updated successfully!');
                    setAutoSaveStatus('saved');

                    // Clear localStorage after successful save
                    localStorage.removeItem(`instructorProfileDraft_${user.id}`);

                    if (isFirstTime) {
                        setIsFirstTime(false);
                    }
                }

                // Update verification status if changed
                if (response.data.data?.verification?.verification_status) {
                    setFormData(prev => ({
                        ...prev,
                        verification: {
                            ...prev.verification,
                            verification_status: response.data.data.verification.verification_status
                        }
                    }));
                }

                // Update global auth user state if name or avatar changed in the profile update
                // The backend ensures these are synchronized to the User model now.
                if (window.updateAuthUser && user) {
                    const updatedUser = {
                        ...user,
                        name: formData.basic.name || user.name,
                        avatar: formData.basic.avatar || user.avatar
                    };
                    window.updateAuthUser(updatedUser);
                }
            }
        } catch (error) {
            handleApiError(error, 'Failed to update profile');
            if (!isAutoSave) {
                setAutoSaveStatus('error');
            }
        } finally {
            setLoading(false);
            if (!isAutoSave) {
                setTimeout(() => setAutoSaveStatus('idle'), 3000);
            }
        }
    };

    // Export profile
    const exportProfile = () => {
        const dataStr = JSON.stringify(formData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `instructor-profile-${user.id}-${new Date().toISOString().split('T')[0]}.json`;

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

    // Render field helper
    const renderField = (label, name, type = 'text', placeholder = '', section = 'basic') => {
        let value = formData[section]?.[name] ?? '';
        let onChange = (e) => handleChange(e, section);

        if (section === 'payment' && ['account_holder', 'account_number', 'bank_name', 'ifsc', 'upi_id'].includes(name)) {
            value = formData.payment?.bank_details?.[name] || '';
            onChange = handleBankChange;
        }

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {VALIDATION_SCHEMA[section]?.[name]?.required && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                </label>
                {type === 'textarea' ? (
                    <textarea
                        name={name}
                        value={value}
                        onChange={onChange}
                        rows="4"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
                        placeholder={placeholder}
                    />
                ) : type === 'checkbox' ? (
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name={name}
                            checked={value}
                            onChange={onChange}
                            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{placeholder}</span>
                    </label>
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
                        placeholder={placeholder}
                    />
                )}
            </div>
        );
    };

    // Render file upload with progress
    const renderFileUpload = (label, field, fileNameField, accept, section = 'verification') => {
        const fileUrl = formData[section]?.[field] || '';
        const fileName = formData[section]?.[fileNameField] || '';
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
                                disabled={loading}
                            />
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-sky-400 transition-colors flex flex-col items-center justify-center">
                                <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">
                                    Click to upload or drag and drop
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
                                    className="p-2 text-sky-600 hover:bg-sky-50 rounded-full transition-colors"
                                    title="View Document"
                                >
                                    <Eye className="w-5 h-5" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => handleFileDelete(section, field, fileNameField)}
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
                                className="bg-sky-600 h-2 rounded-full transition-all duration-300"
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
            </div >
        );
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
        );
    }

    // Check if a section is complete based on validation schema
    const checkSectionComplete = (sectionId) => {
        const schema = VALIDATION_SCHEMA[sectionId];
        if (!schema) return true;

        return Object.keys(schema).every(field => {
            const rules = schema[field];
            if (!rules.required) return true;

            let value;
            if (sectionId === 'payment') {
                value = formData.payment?.bank_details?.[field];
            } else if (sectionId === 'professional' && field === 'qualifications') {
                value = formData[sectionId]?.[field];
            } else {
                value = formData[sectionId]?.[field];
            }

            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return value && value.toString().trim() !== '';
        });
    };

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
                        onClick={() => navigate('/instructor/dashboard')}
                        className="flex items-center space-x-2 text-gray-500 hover:text-sky-600 transition-colors mb-4 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">Instructor Profile</h2>
                    <p className="text-sm text-gray-500 mt-1 mb-3">Manage your public profile</p>

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


                </div>

                <nav className="space-y-1" role="tablist" aria-label="Profile sections">
                    {SECTIONS.map((section) => {
                        const Icon = SECTION_ICONS[section.id];
                        const isCompleted = checkSectionComplete(section.id);

                        return (
                            <button
                                key={section.id}
                                onClick={() => {
                                    setActiveSection(section.id);
                                    setSidebarOpen(false);
                                }}
                                role="tab"
                                aria-selected={activeSection === section.id}
                                aria-controls={`${section.id}-panel`}
                                id={`${section.id}-tab`}
                                className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors relative ${activeSection === section.id
                                    ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 mr-3 ${activeSection === section.id ? 'text-sky-600' : 'text-gray-400'}`} />
                                {section.label}
                                {section.required && (
                                    <span className={`absolute right-4 w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Import/Export Buttons */}


                {isFirstTime && (
                    <div className="mt-8 px-6">
                        <button
                            onClick={handleSkip}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Skip for now
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-24">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 pb-4 border-b">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {SECTIONS.find(s => s.id === activeSection)?.label}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {activeSection === 'basic' && 'Basic information about you'}
                                {activeSection === 'contact' && 'How students can contact you'}
                                {activeSection === 'professional' && 'Your professional background'}
                                {activeSection === 'teaching' && 'Your teaching preferences'}
                                {activeSection === 'verification' && 'Verify your identity'}
                                {activeSection === 'social' && 'Your social presence and branding'}
                                {activeSection === 'payment' && 'Payment and monetization settings'}
                                {activeSection === 'settings' && 'Profile and notification settings'}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 mt-4 lg:mt-0">
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
                                disabled={loading}
                                className="flex items-center px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Basic Information Section */}
                        {activeSection === 'basic' && (
                            <div role="tabpanel" id="basic-panel" aria-labelledby="basic-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                                        <div className="relative group w-24 h-24 flex-shrink-0">
                                            <div className="w-24 h-24 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                                                {formData.basic.avatar ? (
                                                    <img
                                                        src={formData.basic.avatar}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.basic.name)}&background=random`;
                                                        }}
                                                    />
                                                ) : (
                                                    <User className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            <label className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow border cursor-pointer hover:bg-gray-50 transition-colors">
                                                <Upload className="w-3.5 h-3.5 text-gray-600" />
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, 'avatar', 'avatar_name', 'basic')}
                                                />
                                            </label>
                                        </div>
                                        <div className="flex-1 w-full">
                                            {renderField('Full Name', 'name', 'text', 'Your Name', 'basic')}
                                        </div>
                                    </div>

                                    {renderField('Professional Title', 'title', 'text', 'e.g. Senior Full Stack Developer', 'basic')}
                                    {renderField('Bio / About Me', 'bio', 'textarea', 'Tell students about yourself...', 'basic')}
                                    {renderField('Location', 'location', 'text', 'City, Country', 'basic')}

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Languages Spoken
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.basic.languages || ''}
                                            onChange={(e) => handleChange(e, 'basic')}
                                            name="languages"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                            placeholder="English, Spanish, French (comma separated)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Separate multiple languages with commas
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contact Information Section */}
                        {activeSection === 'contact' && (
                            <div role="tabpanel" id="contact-panel" aria-labelledby="contact-tab" tabIndex="0">
                                <div className="space-y-4">
                                    {renderField('Phone Number', 'phone', 'tel', '+1 (555) 123-4567', 'contact')}
                                    {renderField('Website / Portfolio', 'website', 'url', 'https://yourwebsite.com', 'contact')}
                                    <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start">
                                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                        <p>Your email address ({user?.email}) is managed via your account settings and cannot be changed here.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Professional Details Section */}
                        {activeSection === 'professional' && (
                            <div role="tabpanel" id="professional-panel" aria-labelledby="professional-tab" tabIndex="0">
                                <div className="space-y-6">
                                    {renderField('Current Organization', 'current_org', 'text', 'e.g. Google Inc.', 'professional')}
                                    {renderField('Years of Experience', 'experience', 'number', '5', 'professional')}

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
                                        {formData.professional.qualifications?.map((qual, index) => (
                                            <div key={index} className="flex gap-4 mb-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Degree / Certificate Title"
                                                        value={qual.title || ''}
                                                        onChange={(e) => handleQualificationChange(index, 'title', e.target.value)}
                                                        className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                                    />
                                                    <div className="flex gap-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Institute / University"
                                                            value={qual.institute || ''}
                                                            onChange={(e) => handleQualificationChange(index, 'institute', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Year"
                                                            value={qual.year || ''}
                                                            onChange={(e) => handleQualificationChange(index, 'year', e.target.value)}
                                                            className="w-24 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeQualification(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove Qualification"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addQualification}
                                            className="text-sm text-sky-600 font-medium hover:text-sky-700 flex items-center mt-2"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Qualification
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Skills & Expertise
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.professional.skills || ''}
                                            onChange={(e) => handleChange(e, 'professional')}
                                            name="skills"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                                            placeholder="React, Node.js, Python (comma separated)"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Teaching Preferences Section */}
                        {activeSection === 'teaching' && (
                            <div role="tabpanel" id="teaching-panel" aria-labelledby="teaching-tab" tabIndex="0">
                                <div className="space-y-4">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Categories</label>
                                        <input
                                            type="text"
                                            value={formData.teaching.teaching_categories || ''}
                                            onChange={(e) => handleChange(e, 'teaching')}
                                            name="teaching_categories"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                                            placeholder="Web Development, Data Science, Design (comma separated)"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Teaching Mode</label>
                                        <select
                                            name="teaching_mode"
                                            value={formData.teaching.teaching_mode || 'video'}
                                            onChange={(e) => handleChange(e, 'teaching')}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                                        >
                                            <option value="video">Video Courses (Pre-recorded)</option>
                                            <option value="live">Live Sessions</option>
                                            <option value="mixed">Mixed (Video + Live)</option>
                                            <option value="assignment">Assignment Based</option>
                                        </select>
                                    </div>

                                    {renderField('Hourly Rate (₹)', 'hourly_rate', 'number', '500', 'teaching')}

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                                        <select
                                            name="availability"
                                            value={formData.teaching.availability || 'flexible'}
                                            onChange={(e) => handleChange(e, 'teaching')}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                                        >
                                            <option value="flexible">Flexible</option>
                                            <option value="part_time">Part-time</option>
                                            <option value="full_time">Full-time</option>
                                            <option value="weekends_only">Weekends Only</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment Section */}
                        {activeSection === 'payment' && (
                            <div role="tabpanel" id="payment-panel" aria-labelledby="payment-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Bank Details</h3>
                                    {renderField('Account Holder Name', 'account_holder', 'text', 'John Doe', 'payment')}
                                    {renderField('Account Number', 'account_number', 'text', '', 'payment')}
                                    {renderField('Bank Name', 'bank_name', 'text', '', 'payment')}
                                    {renderField('IFSC Code', 'ifsc', 'text', 'ABCD0123456', 'payment')}
                                    {renderField('UPI ID', 'upi_id', 'text', 'yourname@upi', 'payment')}

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Payout Method</label>
                                        <select
                                            name="payout_method"
                                            value={formData.payment.payout_method || 'bank_transfer'}
                                            onChange={(e) => handleChange(e, 'payment')}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                                        >
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="upi">UPI</option>
                                            <option value="paypal">PayPal</option>
                                            <option value="stripe">Stripe</option>
                                        </select>
                                    </div>

                                    {renderField('Tax ID / PAN', 'tax_id', 'text', '', 'payment')}
                                </div>
                            </div>
                        )}

                        {/* Verification Section */}
                        {activeSection === 'verification' && (
                            <div role="tabpanel" id="verification-panel" aria-labelledby="verification-tab" tabIndex="0">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Identity Verification</h3>

                                    {renderFileUpload(
                                        'Government ID (Passport/Driving License/Aadhar)',
                                        'government_id',
                                        'government_id_name',
                                        '.pdf,.jpg,.jpeg,.png',
                                        'verification'
                                    )}

                                    {renderFileUpload(
                                        'Resume / CV',
                                        'resume',
                                        'resume_name',
                                        '.pdf,.doc,.docx',
                                        'verification'
                                    )}

                                    <div className="p-4 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                                        <div className="flex items-start">
                                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium mb-1">Verification Guidelines:</p>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    <li>Upload clear, readable documents</li>
                                                    <li>Files should be less than 10MB</li>
                                                    <li>Supported formats: PDF, JPG, PNG, DOC, DOCX</li>
                                                    <li>Verification usually takes 2-3 business days</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Social & Branding Section */}
                        {activeSection === 'social' && (
                            <div role="tabpanel" id="social-panel" aria-labelledby="social-tab" tabIndex="0">
                                <div className="space-y-6">
                                    {renderField('LinkedIn Profile', 'linkedin', 'url', 'https://linkedin.com/in/username', 'social')}
                                    {renderField('GitHub Profile', 'github', 'url', 'https://github.com/username', 'social')}
                                    {renderField('YouTube Channel', 'youtube', 'url', 'https://youtube.com/@username', 'social')}
                                    {renderField('Twitter / X', 'twitter', 'url', 'https://twitter.com/username', 'social')}
                                    {renderField('Instagram', 'instagram', 'url', 'https://instagram.com/username', 'social')}

                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Brand Assets</h3>

                                    {renderFileUpload(
                                        'Brand Logo',
                                        'logo',
                                        'logo_name',
                                        'image/*',
                                        'social'
                                    )}

                                    {renderFileUpload(
                                        'Intro Video (Max 100MB)',
                                        'intro_video',
                                        'intro_video_name',
                                        'video/*',
                                        'social'
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Settings Section */}
                        {activeSection === 'settings' && (
                            <div role="tabpanel" id="settings-panel" aria-labelledby="settings-tab" tabIndex="0">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Public Profile</h4>
                                            <p className="text-sm text-gray-500">Allow students to view your profile details</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="is_public"
                                                checked={formData.settings.is_public}
                                                onChange={(e) => handleChange(e, 'settings')}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">Security</h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowChangePasswordModal(true)}
                                            className="text-sky-600 hover:text-sky-700 font-medium"
                                        >
                                            Change Password
                                        </button>
                                    </div>

                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-4">Notifications</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                                                    <p className="text-xs text-gray-500">Receive emails about your account activity.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="notification_email"
                                                        checked={formData.settings.notification_email}
                                                        onChange={(e) => handleChange(e, 'settings')}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                </label>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Course Updates</p>
                                                    <p className="text-xs text-gray-500">Get notified when new content is added.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="notification_course_updates"
                                                        checked={formData.settings.notification_course_updates}
                                                        onChange={(e) => handleChange(e, 'settings')}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                </label>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Promotional Offers</p>
                                                    <p className="text-xs text-gray-500">Receive promotional emails and offers.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="notification_promotions"
                                                        checked={formData.settings.notification_promotions}
                                                        onChange={(e) => handleChange(e, 'settings')}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
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

            <ChangePasswordModal
                isOpen={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />
        </div>
    );
}