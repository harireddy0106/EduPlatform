//admin/src/Settings.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Settings as SettingsIcon,
    Save,
    RefreshCw,
    Loader2,
    Shield,
    Users,
    CreditCard,
    Mail,
    Globe,
    Bell,
    Lock,
    Database,
    Server,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    EyeOff,
    ChevronRight,
    Key,
    Calendar,
    FileText,
    Upload,
    Download,
    Trash2,
    Copy,
    ExternalLink,
    HelpCircle,
    Info,
    Search,
    Filter,
    MoreVertical,
    Wifi,
    WifiOff,
    Cloud,
    CloudOff,
    ShieldCheck,
    ShieldAlert,
    UserCheck,
    UserX,
    BookOpen,
    DollarSign,
    Percent,
    Clock,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Check,
    X,
    Plus,
    Minus,
    Edit,
    Grid,
    List,
    Layers,
    Palette,
    Moon,
    Sun,
    Monitor,
    Smartphone,
    Tablet
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [showPassword, setShowPassword] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        general: {
            platformName: 'EduPlatform',
            platformUrl: 'https://eduplatform.example.com',
            contactEmail: 'support@eduplatform.com',
            supportPhone: '+1 (555) 123-4567',
            timezone: 'UTC',
            language: 'en',
            dateFormat: 'DD/MM/YYYY',
            currency: 'INR',
            maintenanceMode: false,
            maintenanceMessage: 'Platform is under maintenance. We\'ll be back soon!',
            enableTwoFactor: true,
            enableIpWhitelist: false,
            allowedIps: []
        },

        authentication: {
            allowInstructorRegistration: true,
            allowStudentRegistration: true,
            requireEmailVerification: true,
            requirePhoneVerification: false,
            socialLogin: {
                google: true,
                facebook: false,
                github: false,
                linkedin: false
            },
            sessionTimeout: 24, // hours
            maxLoginAttempts: 5,
            passwordExpiryDays: 90,
            passwordMinLength: 8,
            passwordRequireSpecial: true,
            passwordRequireNumbers: true,
            passwordRequireUppercase: true
        },

        payment: {
            currency: 'INR',
            paymentGateway: 'razorpay',
            testMode: false,
            razorpayKey: '',
            razorpaySecret: '',
            stripeKey: '',
            stripeSecret: '',
            paypalClientId: '',
            enableTax: true,
            taxPercentage: 18,
            enableDiscounts: true,
            instructorCommission: 70, // percentage
            minimumPayoutAmount: 1000,
            payoutFrequency: 'weekly'
        },

        email: {
            smtpHost: '',
            smtpPort: 587,
            smtpUsername: '',
            smtpPassword: '',
            smtpEncryption: 'tls',
            fromEmail: 'noreply@eduplatform.com',
            fromName: 'EduPlatform',
            enableEmailNotifications: true,
            emailTemplates: {
                welcome: true,
                courseEnrollment: true,
                paymentReceipt: true,
                certificateIssued: true,
                passwordReset: true,
                courseCompleted: true,
                instructorApproval: true
            }
        },

        notifications: {
            enablePushNotifications: true,
            enableEmailNotifications: true,
            enableSmsNotifications: false,
            notificationTypes: {
                newUser: true,
                newCourse: true,
                newEnrollment: true,
                paymentReceived: true,
                supportTicket: true,
                systemAlert: true,
                maintenanceAlert: true
            }
        },

        security: {
            enableHttps: true,
            enableCsrfProtection: true,
            enableRateLimiting: true,
            enableContentSecurityPolicy: true,
            enableXssProtection: true,
            enableClickjackingProtection: true,
            enableMfa: true,
            sessionEncryption: true,
            auditLogging: true,
            loginHistory: true,
            suspiciousActivityAlert: true,
            automaticLogout: true
        },

        appearance: {
            theme: 'light',
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            logoUrl: '',
            faviconUrl: '',
            enableDarkMode: true,
            customCss: '',
            customJs: '',
            homepageLayout: 'grid',
            enableAnimations: true,
            enableRtl: false
        },

        integrations: {
            googleAnalytics: '',
            facebookPixel: '',
            intercom: '',
            zendesk: '',
            mailchimp: '',
            slackWebhook: '',
            enableApi: true,
            apiRateLimit: 100,
            enableWebhooks: false,
            webhookSecret: ''
        }
    });

    const [advancedSettings, setAdvancedSettings] = useState({
        database: {
            backupFrequency: 'daily',
            backupRetention: 30,
            enableAutoBackup: true,
            backupLocation: 'cloud',
            lastBackup: null
        },

        cache: {
            enableRedis: false,
            redisHost: 'localhost',
            redisPort: 6379,
            redisPassword: '',
            cacheDuration: 3600,
            enableBrowserCache: true,
            enableCdn: false,
            cdnUrl: ''
        },

        performance: {
            enableCompression: true,
            enableMinification: true,
            enableLazyLoading: true,
            enableCaching: true,
            imageOptimization: true,
            maxUploadSize: 100, // MB
            concurrentUsers: 1000,
            serverRegion: 'asia-south1'
        }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/admin/settings`);
            if (response.data.success) {
                const data = response.data.settings;
                setSettings(prev => ({ ...prev, ...data }));

                // Also fetch advanced settings if separate endpoint
                const advancedResponse = await axios.get(`${API}/admin/settings/advanced`);
                if (advancedResponse.data.success) {
                    setAdvancedSettings(prev => ({ ...prev, ...advancedResponse.data.settings }));
                }
            }
        } catch (error) {
            console.error("Fetch settings error:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            await axios.put(`${API}/admin/settings`, settings);
            await axios.put(`${API}/admin/settings/advanced`, advancedSettings);

            toast.success('Settings saved successfully', {
                action: {
                    label: 'Reload',
                    onClick: () => window.location.reload()
                }
            });
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleSettingChange = (category, key, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    const handleNestedSettingChange = (category, parentKey, childKey, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [parentKey]: {
                    ...prev[category][parentKey],
                    [childKey]: value
                }
            }
        }));
    };

    const handleAdvancedSettingChange = (category, key, value) => {
        setAdvancedSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    const resetToDefaults = () => {
        if (window.confirm('Are you sure you want to reset all settings to default values?')) {
            setSettings({
                general: {
                    platformName: 'EduPlatform',
                    platformUrl: 'https://eduplatform.example.com',
                    contactEmail: 'support@eduplatform.com',
                    supportPhone: '+1 (555) 123-4567',
                    timezone: 'UTC',
                    language: 'en',
                    dateFormat: 'DD/MM/YYYY',
                    currency: 'INR',
                    maintenanceMode: false,
                    maintenanceMessage: 'Platform is under maintenance. We\'ll be back soon!',
                    enableTwoFactor: true,
                    enableIpWhitelist: false,
                    allowedIps: []
                },
                // ... reset other categories similarly
            });
            toast.success('Settings reset to defaults');
        }
    };

    const testEmailSettings = async () => {
        try {
            await axios.post(`${API}/admin/settings/test-email`);
            toast.success('Test email sent successfully');
        } catch (error) {
            toast.error('Failed to send test email');
        }
    };

    const backupDatabase = async () => {
        try {
            toast.loading('Creating database backup...');
            const response = await axios.post(`${API}/admin/settings/backup`);
            if (response.data.success) {
                toast.success('Database backup created successfully');
                // Update last backup timestamp
                setAdvancedSettings(prev => ({
                    ...prev,
                    database: {
                        ...prev.database,
                        lastBackup: new Date().toISOString()
                    }
                }));
            }
        } catch (error) {
            toast.error('Failed to create backup');
        }
    };

    const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
        <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            style={{
                backgroundColor: enabled ? '#10b981' : '#d1d5db'
            }}
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    const SettingSection = ({ title, description, icon: Icon, children }) => (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{title}</h3>
                        {description && (
                            <p className="text-sm text-gray-500 mt-1">{description}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );

    const SettingItem = ({ label, description, children, optional = false }) => (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <label className="font-medium text-gray-900">{label}</label>
                    {optional && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Optional</span>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
            </div>
            <div className="md:w-64">
                {children}
            </div>
        </div>
    );

    const TabButton = ({ name, icon: Icon, active }) => (
        <button
            onClick={() => setActiveTab(name.toLowerCase())}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{name}</span>
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
                    <p className="text-gray-600 mt-2">
                        Configure and customize your platform's behavior and appearance
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={resetToDefaults}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Reset Defaults
                    </button>
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar - Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sticky top-6">
                        <div className="space-y-2">
                            <TabButton
                                name="General"
                                icon={SettingsIcon}
                                active={activeTab === 'general'}
                            />
                            <TabButton
                                name="Authentication"
                                icon={Lock}
                                active={activeTab === 'authentication'}
                            />
                            <TabButton
                                name="Payment"
                                icon={CreditCard}
                                active={activeTab === 'payment'}
                            />
                            <TabButton
                                name="Email"
                                icon={Mail}
                                active={activeTab === 'email'}
                            />
                            <TabButton
                                name="Notifications"
                                icon={Bell}
                                active={activeTab === 'notifications'}
                            />
                            <TabButton
                                name="Security"
                                icon={Shield}
                                active={activeTab === 'security'}
                            />
                            <TabButton
                                name="Appearance"
                                icon={Palette}
                                active={activeTab === 'appearance'}
                            />
                            <TabButton
                                name="Integrations"
                                icon={Layers}
                                active={activeTab === 'integrations'}
                            />
                            <TabButton
                                name="Advanced"
                                icon={Server}
                                active={activeTab === 'advanced'}
                            />
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
                            <div className="space-y-2">
                                <button
                                    onClick={testEmailSettings}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Test Email Configuration
                                </button>
                                <button
                                    onClick={backupDatabase}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Backup Database
                                </button>
                                <button
                                    onClick={() => toast.info('Clear cache feature')}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Clear Cache
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <SettingSection title="General Settings" icon={SettingsIcon}>
                            <div className="space-y-2">
                                <SettingItem
                                    label="Platform Name"
                                    description="Display name of your platform"
                                >
                                    <input
                                        type="text"
                                        value={settings.general.platformName}
                                        onChange={(e) => handleSettingChange('general', 'platformName', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Platform URL"
                                    description="Your platform's base URL"
                                >
                                    <input
                                        type="url"
                                        value={settings.general.platformUrl}
                                        onChange={(e) => handleSettingChange('general', 'platformUrl', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Contact Email"
                                    description="Primary contact email for support"
                                >
                                    <input
                                        type="email"
                                        value={settings.general.contactEmail}
                                        onChange={(e) => handleSettingChange('general', 'contactEmail', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Maintenance Mode"
                                    description="Take the platform offline for maintenance"
                                >
                                    <div className="flex items-center justify-between">
                                        <ToggleSwitch
                                            enabled={settings.general.maintenanceMode}
                                            onChange={(value) => handleSettingChange('general', 'maintenanceMode', value)}
                                        />
                                        <span className="text-sm text-gray-600 ml-3">
                                            {settings.general.maintenanceMode ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </SettingItem>

                                {settings.general.maintenanceMode && (
                                    <SettingItem
                                        label="Maintenance Message"
                                        description="Message shown to users during maintenance"
                                    >
                                        <textarea
                                            value={settings.general.maintenanceMessage}
                                            onChange={(e) => handleSettingChange('general', 'maintenanceMessage', e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </SettingItem>
                                )}

                                <SettingItem
                                    label="Timezone"
                                    description="Default timezone for the platform"
                                >
                                    <select
                                        value={settings.general.timezone}
                                        onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="Asia/Kolkata">IST (India)</option>
                                        <option value="America/New_York">EST (New York)</option>
                                        <option value="Europe/London">GMT (London)</option>
                                    </select>
                                </SettingItem>

                                <SettingItem
                                    label="Default Currency"
                                    description="Primary currency for transactions"
                                >
                                    <select
                                        value={settings.general.currency}
                                        onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="INR">Indian Rupee (₹)</option>
                                        <option value="USD">US Dollar ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                        <option value="GBP">British Pound (£)</option>
                                    </select>
                                </SettingItem>
                            </div>
                        </SettingSection>
                    )}

                    {/* Authentication Settings */}
                    {activeTab === 'authentication' && (
                        <SettingSection title="Authentication Settings" icon={Lock}>
                            <div className="space-y-2">
                                <SettingItem
                                    label="Allow Instructor Registration"
                                    description="Allow new instructors to register on the platform"
                                >
                                    <ToggleSwitch
                                        enabled={settings.authentication.allowInstructorRegistration}
                                        onChange={(value) => handleSettingChange('authentication', 'allowInstructorRegistration', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Allow Student Registration"
                                    description="Allow new students to register on the platform"
                                >
                                    <ToggleSwitch
                                        enabled={settings.authentication.allowStudentRegistration}
                                        onChange={(value) => handleSettingChange('authentication', 'allowStudentRegistration', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Require Email Verification"
                                    description="Users must verify their email address before accessing the platform"
                                >
                                    <ToggleSwitch
                                        enabled={settings.authentication.requireEmailVerification}
                                        onChange={(value) => handleSettingChange('authentication', 'requireEmailVerification', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Session Timeout"
                                    description="User session expiration time (in hours)"
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="720"
                                            value={settings.authentication.sessionTimeout}
                                            onChange={(e) => handleSettingChange('authentication', 'sessionTimeout', parseInt(e.target.value))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <span className="text-gray-500">hours</span>
                                    </div>
                                </SettingItem>

                                <SettingItem
                                    label="Maximum Login Attempts"
                                    description="Maximum failed login attempts before account lock"
                                >
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={settings.authentication.maxLoginAttempts}
                                        onChange={(e) => handleSettingChange('authentication', 'maxLoginAttempts', parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Password Minimum Length"
                                    description="Minimum characters required for passwords"
                                >
                                    <input
                                        type="number"
                                        min="6"
                                        max="32"
                                        value={settings.authentication.passwordMinLength}
                                        onChange={(e) => handleSettingChange('authentication', 'passwordMinLength', parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </SettingItem>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Require Uppercase Letters</span>
                                            <ToggleSwitch
                                                enabled={settings.authentication.passwordRequireUppercase}
                                                onChange={(value) => handleSettingChange('authentication', 'passwordRequireUppercase', value)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Require Numbers</span>
                                            <ToggleSwitch
                                                enabled={settings.authentication.passwordRequireNumbers}
                                                onChange={(value) => handleSettingChange('authentication', 'passwordRequireNumbers', value)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Require Special Characters</span>
                                            <ToggleSwitch
                                                enabled={settings.authentication.passwordRequireSpecial}
                                                onChange={(value) => handleSettingChange('authentication', 'passwordRequireSpecial', value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SettingSection>
                    )}

                    {/* Payment Settings */}
                    {activeTab === 'payment' && (
                        <SettingSection title="Payment Settings" icon={CreditCard}>
                            <div className="space-y-2">
                                <SettingItem
                                    label="Payment Gateway"
                                    description="Primary payment gateway for transactions"
                                >
                                    <select
                                        value={settings.payment.paymentGateway}
                                        onChange={(e) => handleSettingChange('payment', 'paymentGateway', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="razorpay">Razorpay</option>
                                        <option value="stripe">Stripe</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </SettingItem>

                                <SettingItem
                                    label="Test Mode"
                                    description="Use test mode for payments (no real transactions)"
                                >
                                    <ToggleSwitch
                                        enabled={settings.payment.testMode}
                                        onChange={(value) => handleSettingChange('payment', 'testMode', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Instructor Commission"
                                    description="Percentage of revenue shared with instructors"
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.payment.instructorCommission}
                                            onChange={(e) => handleSettingChange('payment', 'instructorCommission', parseInt(e.target.value))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <span className="text-gray-500">%</span>
                                    </div>
                                </SettingItem>

                                <SettingItem
                                    label="Tax Percentage"
                                    description="Tax applied to all transactions"
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            step="0.1"
                                            value={settings.payment.taxPercentage}
                                            onChange={(e) => handleSettingChange('payment', 'taxPercentage', parseFloat(e.target.value))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <span className="text-gray-500">%</span>
                                    </div>
                                </SettingItem>

                                <SettingItem
                                    label="Minimum Payout Amount"
                                    description="Minimum amount required for instructor payout"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={settings.payment.minimumPayoutAmount}
                                            onChange={(e) => handleSettingChange('payment', 'minimumPayoutAmount', parseInt(e.target.value))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </SettingItem>

                                <SettingItem
                                    label="Payout Frequency"
                                    description="How often instructors receive payouts"
                                >
                                    <select
                                        value={settings.payment.payoutFrequency}
                                        onChange={(e) => handleSettingChange('payment', 'payoutFrequency', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </SettingItem>

                                {/* Payment Gateway Credentials (conditionally shown) */}
                                {settings.payment.paymentGateway === 'razorpay' && (
                                    <>
                                        <SettingItem
                                            label="Razorpay Key ID"
                                            description="Your Razorpay API Key ID"
                                        >
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={settings.payment.razorpayKey}
                                                    onChange={(e) => handleSettingChange('payment', 'razorpayKey', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </SettingItem>

                                        <SettingItem
                                            label="Razorpay Key Secret"
                                            description="Your Razorpay API Key Secret"
                                        >
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={settings.payment.razorpaySecret}
                                                    onChange={(e) => handleSettingChange('payment', 'razorpaySecret', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </SettingItem>
                                    </>
                                )}
                            </div>
                        </SettingSection>
                    )}

                    {/* Security Settings */}
                    {activeTab === 'security' && (
                        <SettingSection title="Security Settings" icon={Shield}>
                            <div className="space-y-2">
                                <SettingItem
                                    label="Enable HTTPS"
                                    description="Force HTTPS connections for all requests"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.enableHttps}
                                        onChange={(value) => handleSettingChange('security', 'enableHttps', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Enable Rate Limiting"
                                    description="Limit number of requests from a single IP address"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.enableRateLimiting}
                                        onChange={(value) => handleSettingChange('security', 'enableRateLimiting', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Enable CSRF Protection"
                                    description="Protect against Cross-Site Request Forgery attacks"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.enableCsrfProtection}
                                        onChange={(value) => handleSettingChange('security', 'enableCsrfProtection', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Enable XSS Protection"
                                    description="Protect against Cross-Site Scripting attacks"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.enableXssProtection}
                                        onChange={(value) => handleSettingChange('security', 'enableXssProtection', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Enable Two-Factor Authentication"
                                    description="Require 2FA for admin accounts"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.enableMfa}
                                        onChange={(value) => handleSettingChange('security', 'enableMfa', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Audit Logging"
                                    description="Log all admin actions for security audit"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.auditLogging}
                                        onChange={(value) => handleSettingChange('security', 'auditLogging', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Login History"
                                    description="Track user login history and IP addresses"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.loginHistory}
                                        onChange={(value) => handleSettingChange('security', 'loginHistory', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Suspicious Activity Alerts"
                                    description="Send alerts for suspicious login attempts"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.suspiciousActivityAlert}
                                        onChange={(value) => handleSettingChange('security', 'suspiciousActivityAlert', value)}
                                    />
                                </SettingItem>

                                <SettingItem
                                    label="Automatic Logout"
                                    description="Automatically log out inactive users"
                                >
                                    <ToggleSwitch
                                        enabled={settings.security.automaticLogout}
                                        onChange={(value) => handleSettingChange('security', 'automaticLogout', value)}
                                    />
                                </SettingItem>
                            </div>
                        </SettingSection>
                    )}

                    {/* Advanced Settings */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-6">
                            <SettingSection title="Database Settings" icon={Database}>
                                <div className="space-y-2">
                                    <SettingItem
                                        label="Automatic Backup"
                                        description="Automatically backup database at scheduled intervals"
                                    >
                                        <ToggleSwitch
                                            enabled={advancedSettings.database.enableAutoBackup}
                                            onChange={(value) => handleAdvancedSettingChange('database', 'enableAutoBackup', value)}
                                        />
                                    </SettingItem>

                                    {advancedSettings.database.enableAutoBackup && (
                                        <>
                                            <SettingItem
                                                label="Backup Frequency"
                                                description="How often to create automatic backups"
                                            >
                                                <select
                                                    value={advancedSettings.database.backupFrequency}
                                                    onChange={(e) => handleAdvancedSettingChange('database', 'backupFrequency', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="hourly">Hourly</option>
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </SettingItem>

                                            <SettingItem
                                                label="Backup Retention"
                                                description="Number of days to keep backups"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="365"
                                                        value={advancedSettings.database.backupRetention}
                                                        onChange={(e) => handleAdvancedSettingChange('database', 'backupRetention', parseInt(e.target.value))}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <span className="text-gray-500">days</span>
                                                </div>
                                            </SettingItem>
                                        </>
                                    )}

                                    <SettingItem
                                        label="Last Backup"
                                        description="Date and time of last database backup"
                                    >
                                        <div className="text-gray-600">
                                            {advancedSettings.database.lastBackup
                                                ? new Date(advancedSettings.database.lastBackup).toLocaleString()
                                                : 'No backups yet'}
                                        </div>
                                    </SettingItem>
                                </div>
                            </SettingSection>

                            <SettingSection title="Cache Settings" icon={Server}>
                                <div className="space-y-2">
                                    <SettingItem
                                        label="Enable Redis Cache"
                                        description="Use Redis for improved performance"
                                    >
                                        <ToggleSwitch
                                            enabled={advancedSettings.cache.enableRedis}
                                            onChange={(value) => handleAdvancedSettingChange('cache', 'enableRedis', value)}
                                        />
                                    </SettingItem>

                                    {advancedSettings.cache.enableRedis && (
                                        <>
                                            <SettingItem
                                                label="Redis Host"
                                                description="Redis server hostname"
                                            >
                                                <input
                                                    type="text"
                                                    value={advancedSettings.cache.redisHost}
                                                    onChange={(e) => handleAdvancedSettingChange('cache', 'redisHost', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </SettingItem>

                                            <SettingItem
                                                label="Cache Duration"
                                                description="Time in seconds to cache data"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="86400"
                                                        value={advancedSettings.cache.cacheDuration}
                                                        onChange={(e) => handleAdvancedSettingChange('cache', 'cacheDuration', parseInt(e.target.value))}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <span className="text-gray-500">seconds</span>
                                                </div>
                                            </SettingItem>
                                        </>
                                    )}
                                </div>
                            </SettingSection>

                            <SettingSection title="Performance Settings" icon={TrendingUp}>
                                <div className="space-y-2">
                                    <SettingItem
                                        label="Enable Compression"
                                        description="Compress responses for faster loading"
                                    >
                                        <ToggleSwitch
                                            enabled={advancedSettings.performance.enableCompression}
                                            onChange={(value) => handleAdvancedSettingChange('performance', 'enableCompression', value)}
                                        />
                                    </SettingItem>

                                    <SettingItem
                                        label="Enable Minification"
                                        description="Minify CSS and JavaScript files"
                                    >
                                        <ToggleSwitch
                                            enabled={advancedSettings.performance.enableMinification}
                                            onChange={(value) => handleAdvancedSettingChange('performance', 'enableMinification', value)}
                                        />
                                    </SettingItem>

                                    <SettingItem
                                        label="Enable Lazy Loading"
                                        description="Load images and content as needed"
                                    >
                                        <ToggleSwitch
                                            enabled={advancedSettings.performance.enableLazyLoading}
                                            onChange={(value) => handleAdvancedSettingChange('performance', 'enableLazyLoading', value)}
                                        />
                                    </SettingItem>

                                    <SettingItem
                                        label="Max Upload Size"
                                        description="Maximum file upload size"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="1024"
                                                value={advancedSettings.performance.maxUploadSize}
                                                onChange={(e) => handleAdvancedSettingChange('performance', 'maxUploadSize', parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <span className="text-gray-500">MB</span>
                                        </div>
                                    </SettingItem>
                                </div>
                            </SettingSection>
                        </div>
                    )}

                    {/* Save Button at bottom */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Save Your Changes</p>
                                <p className="text-sm text-gray-500">All changes are applied immediately after saving</p>
                            </div>
                            <button
                                onClick={saveSettings}
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save All Settings
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Modal for Critical Changes */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-yellow-500" />
                        <h3 className="font-bold text-gray-900">Confirm Changes</h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Changing these settings may affect platform functionality. Are you sure you want to proceed?
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;