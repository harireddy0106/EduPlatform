//admin/src/Profile.jsx

import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
    User,
    Lock,
    Shield,
    Mail,
    Save,
    Camera,
    Eye,
    EyeOff,
    Key,
    Smartphone,
    Globe,
    Calendar,
    Clock,
    Activity,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Edit,
    Trash2,
    Upload,
    Download,
    Copy,
    ExternalLink,
    Bell,
    ShieldCheck,
    ShieldAlert,
    UserCheck,
    UserX,
    RefreshCw,
    MoreVertical,
    ChevronRight,
    ChevronLeft,
    Settings,
    Database,
    Server,
    LogOut,
    BellOff,
    BellRing,
    Monitor,
    Smartphone as Mobile,
    Tablet,
    Award,
    TrendingUp,
    FileText,
    CreditCard,
    BarChart3,
    HelpCircle,
    Info,
    ChevronDown
} from 'lucide-react';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Profile = () => {
    const navigate = useNavigate();
    const { user, setUser, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [showPassword, setShowPassword] = useState(false);
    const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);

    // Profile State
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        title: '',
        bio: '',
        timezone: 'UTC',
        language: 'en',
        avatar: ''
    });

    // Security State
    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Preferences State
    const [preferences, setPreferences] = useState({
        emailNotifications: {
            security: true,
            system: true,
            marketing: false,
            weeklyDigest: true
        },
        pushNotifications: true,
        theme: 'light',
        compactMode: false,
        autosave: true,
        autoLogout: 30,
        dashboardView: 'grid'
    });

    // Sessions State
    const [sessions, setSessions] = useState([]);
    const [activityLog, setActivityLog] = useState([]);

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                title: user.title || 'Administrator',
                bio: user.bio || '',
                timezone: user.timezone || 'UTC',
                language: user.language || 'en',
                avatar: user.avatar || ''
            });
            fetchSessions();
            fetchActivityLog();
        }
    }, [user]);

    const fetchSessions = async () => {
        try {
            const response = await axios.get(`${API}/auth/sessions`);
            if (response.data.success) {
                setSessions(response.data.sessions);
            }
        } catch (error) {
            console.error("Fetch sessions error:", error);
        }
    };

    const fetchActivityLog = async () => {
        try {
            const response = await axios.get(`${API}/auth/activity`);
            if (response.data.success) {
                setActivityLog(response.data.activities);
            }
        } catch (error) {
            console.error("Fetch activity error:", error);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.put(`${API}/auth/profile`, profileData);
            if (response.data.success) {
                toast.success('Profile updated successfully');
                setUser({ ...user, ...profileData });
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (securityData.newPassword !== securityData.confirmPassword) {
            return toast.error("New passwords do not match");
        }

        setLoading(true);
        try {
            await axios.post(`${API}/auth/change-password`, {
                currentPassword: securityData.currentPassword,
                newPassword: securityData.newPassword
            });
            toast.success("Password changed successfully");
            setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            setLoading(true);
            const response = await axios.post(`${API}/auth/upload-avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const newAvatar = response.data.avatarUrl;
                setProfileData(prev => ({ ...prev, avatar: newAvatar }));
                setUser({ ...user, avatar: newAvatar });
                toast.success('Profile picture updated');
            }
        } catch (error) {
            toast.error("Failed to upload image");
        } finally {
            setLoading(false);
        }
    };

    const handleEnableTwoFactor = async () => {
        try {
            const response = await axios.post(`${API}/auth/enable-2fa`);
            if (response.data.success) {
                setShowTwoFactorSetup(true);
                setRecoveryCodes(response.data.recoveryCodes);
                toast.info('Scan QR code with authenticator app');
            }
        } catch (error) {
            toast.error("Failed to enable 2FA");
        }
    };

    const handleVerifyTwoFactor = async () => {
        if (!twoFactorCode || twoFactorCode.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        try {
            const response = await axios.post(`${API}/auth/verify-2fa`, { code: twoFactorCode });
            if (response.data.success) {
                setShowTwoFactorSetup(false);
                setUser({ ...user, two_factor_enabled: true });
                toast.success("Two-factor authentication enabled successfully");

                // Show recovery codes in modal
                toast("Save your recovery codes!", {
                    description: "These codes can be used if you lose access to your authenticator app.",
                    duration: 10000,
                    action: {
                        label: "Copy Codes",
                        onClick: () => navigator.clipboard.writeText(recoveryCodes.join('\n'))
                    }
                });
            }
        } catch (error) {
            toast.error("Invalid verification code");
        }
    };

    const handleTerminateSession = async (sessionId) => {
        if (!window.confirm('Are you sure you want to terminate this session?')) return;

        try {
            await axios.delete(`${API}/auth/sessions/${sessionId}`);
            toast.success('Session terminated');
            fetchSessions();
        } catch (error) {
            toast.error("Failed to terminate session");
        }
    };

    const handleTerminateAllSessions = async () => {
        if (!window.confirm('Terminate all sessions except this one?')) return;

        try {
            await axios.delete(`${API}/auth/sessions/all`);
            toast.success('All other sessions terminated');
            fetchSessions();
        } catch (error) {
            toast.error("Failed to terminate sessions");
        }
    };

    const handleExportData = async () => {
        try {
            toast.loading('Preparing data export...');
            const response = await axios.get(`${API}/auth/export-data`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `admin-data-${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('Data exported successfully');
        } catch (error) {
            toast.error("Failed to export data");
        }
    };

    const TabButton = ({ name, icon: Icon, count }) => (
        <button
            onClick={() => setActiveTab(name.toLowerCase())}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === name.toLowerCase()
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{name}</span>
            {count && (
                <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {count}
                </span>
            )}
        </button>
    );

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );

    const SessionItem = ({ session }) => (
        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${session.isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {session.deviceType === 'mobile' ? <Mobile className="w-5 h-5" /> :
                        session.deviceType === 'tablet' ? <Tablet className="w-5 h-5" /> :
                            <Monitor className="w-5 h-5" />}
                </div>
                <div>
                    <p className="font-medium text-gray-900">{session.browser} on {session.os}</p>
                    <p className="text-sm text-gray-500">{session.ipAddress} • {session.location}</p>
                    <p className="text-xs text-gray-400">Last active: {new Date(session.lastActive).toLocaleString()}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {session.isCurrent ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Current
                    </span>
                ) : (
                    <button
                        onClick={() => handleTerminateSession(session.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Terminate Session"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );

    const ActivityItem = ({ activity }) => (
        <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-0">
            <div className={`p-2 rounded-full ${activity.type === 'login' ? 'bg-green-100 text-green-600' :
                activity.type === 'logout' ? 'bg-gray-100 text-gray-600' :
                    activity.type === 'password_change' ? 'bg-blue-100 text-blue-600' :
                        'bg-yellow-100 text-yellow-600'}`}>
                {activity.type === 'login' ? <UserCheck className="w-4 h-4" /> :
                    activity.type === 'logout' ? <UserX className="w-4 h-4" /> :
                        activity.type === 'password_change' ? <Lock className="w-4 h-4" /> :
                            <Activity className="w-4 h-4" />}
            </div>
            <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.description}</p>
                <p className="text-sm text-gray-500">{activity.ipAddress} • {activity.location}</p>
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
                    <p className="text-gray-600 mt-2">
                        Manage your account settings, security, and preferences
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={handleExportData}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-6">
                        {/* Profile Summary */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {profileData.avatar ? (
                                        <img
                                            src={profileData.avatar}
                                            alt={profileData.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        profileData.name.charAt(0)
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-white border border-gray-200 rounded-full shadow-md cursor-pointer hover:bg-gray-50">
                                    <Camera className="w-4 h-4 text-gray-600" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                    />
                                </label>
                            </div>
                            <h2 className="font-bold text-gray-900 text-lg">{profileData.name}</h2>
                            <p className="text-gray-500 text-sm">{profileData.title}</p>
                            <div className="flex items-center gap-2 mt-2">
                                {user?.two_factor_enabled ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                        <ShieldCheck className="w-3 h-3" />
                                        2FA Enabled
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                        <ShieldAlert className="w-3 h-3" />
                                        2FA Disabled
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                    <Award className="w-3 h-3" />
                                    Admin
                                </span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="space-y-2">
                            <TabButton name="Profile" icon={User} />
                            <TabButton name="Security" icon={Shield} count={sessions.length} />
                            <TabButton name="Preferences" icon={Settings} />
                            <TabButton name="Sessions" icon={Monitor} count={sessions.length} />
                            <TabButton name="Activity" icon={Activity} count={activityLog.length} />
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="text-xs text-gray-500 mb-3">Account Stats</div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Member Since</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Last Login</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Today'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Active Sessions</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {sessions.filter(s => s.isActive).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="border-b border-gray-100 px-6 py-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-600" />
                                    Personal Information
                                </h2>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                value={profileData.email}
                                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <div className="relative">
                                            <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Job Title
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.title}
                                            onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={profileData.bio}
                                            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                            rows={4}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Timezone
                                        </label>
                                        <select
                                            value={profileData.timezone}
                                            onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="UTC">UTC</option>
                                            <option value="Asia/Kolkata">IST (India)</option>
                                            <option value="America/New_York">EST (New York)</option>
                                            <option value="Europe/London">GMT (London)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Language
                                        </label>
                                        <select
                                            value={profileData.language}
                                            onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="en">English</option>
                                            <option value="es">Spanish</option>
                                            <option value="fr">French</option>
                                            <option value="de">German</option>
                                            <option value="hi">Hindi</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setProfileData({
                                            name: user.name || '',
                                            email: user.email || '',
                                            phone: user.phone || '',
                                            title: user.title || 'Administrator',
                                            bio: user.bio || '',
                                            timezone: user.timezone || 'UTC',
                                            language: user.language || 'en',
                                            avatar: user.avatar || ''
                                        })}
                                        className="px-4 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-4 h-4" />
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Password Change */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="border-b border-gray-100 px-6 py-4">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-blue-600" />
                                        Change Password
                                    </h2>
                                </div>

                                <form onSubmit={handlePasswordChange} className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Current Password
                                            </label>
                                            <div className="relative">
                                                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    value={securityData.currentPassword}
                                                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    New Password
                                                </label>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    value={securityData.newPassword}
                                                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Confirm New Password
                                                </label>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    value={securityData.confirmPassword}
                                                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Requirements */}
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</p>
                                            <ul className="text-sm text-gray-600 space-y-1">
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    At least 8 characters
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    Contains uppercase & lowercase letters
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    Includes numbers and special characters
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="px-6 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? 'Updating...' : 'Update Password'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Two-Factor Authentication */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="border-b border-gray-100 px-6 py-4">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                        Two-Factor Authentication
                                    </h2>
                                </div>

                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {user?.two_factor_enabled ? '2FA is enabled' : '2FA is not enabled'}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Add an extra layer of security to your account
                                            </p>
                                        </div>

                                        {user?.two_factor_enabled ? (
                                            <button
                                                onClick={() => toast.info('Disable 2FA feature')}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Disable 2FA
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleEnableTwoFactor}
                                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
                                            >
                                                Enable 2FA
                                            </button>
                                        )}
                                    </div>

                                    {showTwoFactorSetup && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                            <div className="flex flex-col md:flex-row items-center gap-6">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 mb-2">Setup Two-Factor Authentication</h3>
                                                    <ol className="text-sm text-gray-600 space-y-2 mb-4">
                                                        <li>1. Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                                                        <li>2. Scan the QR code with your app</li>
                                                        <li>3. Enter the 6-digit code from the app</li>
                                                    </ol>

                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Enter 6-digit code
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                maxLength="6"
                                                                value={twoFactorCode}
                                                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                                className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest"
                                                                placeholder="000000"
                                                            />
                                                            <button
                                                                onClick={handleVerifyTwoFactor}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                            >
                                                                Verify
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sessions Tab */}
                    {activeTab === 'sessions' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="border-b border-gray-100 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <Monitor className="w-5 h-5 text-blue-600" />
                                            Active Sessions ({sessions.length})
                                        </h2>
                                        <button
                                            onClick={handleTerminateAllSessions}
                                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Terminate All Other Sessions
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {sessions.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-600">No active sessions found</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {sessions.map((session) => (
                                                <SessionItem key={session.id} session={session} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="border-b border-gray-100 px-6 py-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                    Recent Activity
                                </h2>
                            </div>

                            <div className="p-6">
                                {activityLog.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600">No recent activity</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                <span>Today</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            {activityLog.slice(0, 10).map((activity, index) => (
                                                <ActivityItem key={index} activity={activity} />
                                            ))}
                                        </div>

                                        {activityLog.length > 10 && (
                                            <button className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                                                Show All Activity
                                                <ChevronDown className="w-4 h-4 inline ml-1" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    {(activeTab === 'security' || activeTab === 'profile') && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-red-900 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Danger Zone
                                    </h3>
                                    <p className="text-red-700 text-sm mt-1">
                                        These actions are irreversible. Please proceed with caution.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => toast.error('Account deletion feature')}
                                        className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        Delete Account
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Logout All Devices
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;