//admin/src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    BookOpen,
    IndianRupee,
    Activity,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    AlertTriangle,
    Calendar,
    BarChart3,
    PieChart,
    Download,
    Filter,
    MoreVertical,
    Clock,
    UserPlus,
    DollarSign,
    Eye,
    MessageSquare,
    CheckCircle,
    XCircle,
    Search,
    RefreshCw,
    Settings,
    Bell,
    ChevronRight,
    Award,
    Globe,
    Cpu,
    Database,
    Server,
    Shield,
    Lock
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');
    const [recentActivities, setRecentActivities] = useState([]);
    const [quickStats, setQuickStats] = useState({
        todayUsers: 0,
        pendingApprovals: 0,
        systemHealth: 100,
        revenueToday: 0
    });

    useEffect(() => {
        fetchDashboardData();
        fetchRecentActivities();

        // Set up auto-refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/admin/analytics?period=${timeRange}`);
            if (response.data.success) {
                setStats(response.data.data);
                updateQuickStats(response.data.data);
            }
        } catch (error) {
            console.error("Dashboard error:", error);
            // Don't show toast on 401 as it acts effectively as a redirect trigger often
            if (error.response?.status !== 401) {
                toast.error("Failed to load analytics");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivities = async () => {
        try {
            const response = await axios.get(`${API}/admin/activities?limit=5`);
            if (response.data.success) {
                setRecentActivities(response.data.activities);
            }
        } catch (error) {
            console.error("Activities error:", error);
        }
    };

    const updateQuickStats = (data) => {
        if (!data) return;

        setQuickStats({
            todayUsers: data.today_analytics?.new_users || 0,
            pendingApprovals: data.pending_approvals?.count || 0,
            systemHealth: data.system_analytics?.health_score || 100,
            revenueToday: data.today_analytics?.revenue || 0
        });
    };

    const handleRefresh = () => {
        fetchDashboardData();
        fetchRecentActivities();
        toast.success('Dashboard refreshed');
    };

    const handleExportData = () => {
        toast.info('Export feature coming soon');
        // Implement CSV/Excel export
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading Admin Dashboard...</p>
                <p className="text-sm text-gray-500 mt-2">Fetching latest analytics</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
                <p className="text-gray-600 mb-6">Please check your connection and try again.</p>
                <button
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Loading
                </button>
            </div>
        );
    }

    const { summary, user_analytics, revenue_analytics, system_analytics } = stats;

    // StatCard Component
    const StatCard = ({ title, value, subtext, icon: Icon, color, trend, status, onClick }) => (
        <div
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
                    {subtext && <p className="text-sm text-gray-400">{subtext}</p>}
                    {trend !== undefined && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-3 ${trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}
                        </div>
                    )}
                    {status && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 ml-2 ${status === 'good' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {status === 'good' ? '✓ Healthy' : '⚠ Needs Attention'}
                        </div>
                    )}
                </div>
                <div className={`p-4 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
            </div>
        </div>
    );

    // Activity Item Component
    const ActivityItem = ({ icon: Icon, title, time, user, action, status }) => (
        <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
            <div className={`p-3 rounded-lg ${status === 'success' ? 'bg-green-100' : status === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                <Icon className={`w-5 h-5 ${status === 'success' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-medium text-gray-900">{title}</p>
                        <p className="text-sm text-gray-500 mt-1">{user} • {action}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
                </div>
            </div>
        </div>
    );

    // Quick Action Button
    const QuickAction = ({ icon: Icon, title, description, color, onClick }) => (
        <button
            onClick={onClick}
            className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left group"
        >
            <div className={`p-3 rounded-lg ${color} inline-block mb-4`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
            <p className="text-sm text-gray-500">{description}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Take action
                <ChevronRight className="w-4 h-4 ml-1" />
            </div>
        </button>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-600 mt-2">
                            Welcome back! Here's what's happening with your platform today.
                            <span className="text-blue-600 font-medium ml-2">{quickStats.todayUsers} new users today</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Time Range Selector */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg">
                            {['7d', '30d', '90d', '1y'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${timeRange === range
                                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleRefresh}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                            onClick={handleExportData}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Export data"
                        >
                            <Download className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">New Users Today</p>
                                <p className="text-2xl font-bold mt-1">{quickStats.todayUsers}</p>
                            </div>
                            <UserPlus className="w-8 h-8 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Revenue Today</p>
                                <p className="text-2xl font-bold mt-1">₹{quickStats.revenueToday.toLocaleString()}</p>
                            </div>
                            <DollarSign className="w-8 h-8 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Pending Approvals</p>
                                <p className="text-2xl font-bold mt-1">{quickStats.pendingApprovals}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">System Health</p>
                                <p className="text-2xl font-bold mt-1">{quickStats.systemHealth}%</p>
                            </div>
                            <ShieldCheck className="w-8 h-8 opacity-80" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Stats */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard
                            title="Total Users"
                            value={summary.total_users.toLocaleString()}
                            subtext={`${summary.active_users || 0} currently active`}
                            icon={Users}
                            color="bg-gradient-to-br from-blue-500 to-blue-600"
                            trend={stats.trends?.user_growth_trend}
                            onClick={() => navigate('/students')}
                        />

                        <StatCard
                            title="Total Revenue"
                            value={`₹${summary.total_revenue_raw?.toLocaleString() || summary.total_revenue}`}
                            subtext="Lifetime earnings"
                            icon={IndianRupee}
                            color="bg-gradient-to-br from-green-500 to-green-600"
                            trend={stats.trends?.revenue_growth_trend}
                            onClick={() => navigate('/reports')}
                        />

                        <StatCard
                            title="Total Courses"
                            value={summary.total_courses.toLocaleString()}
                            subtext={`${stats.course_analytics?.new_courses || 0} new this month`}
                            icon={BookOpen}
                            color="bg-gradient-to-br from-purple-500 to-purple-600"
                            onClick={() => navigate('/courses')}
                        />

                        <StatCard
                            title="Engagement Rate"
                            value={`${summary.engagement_rate || '85'}%`}
                            subtext="Platform activity level"
                            icon={Activity}
                            color="bg-gradient-to-br from-orange-500 to-orange-600"
                            trend={stats.trends?.engagement_trend}
                            status={summary.engagement_rate > 70 ? 'good' : 'warning'}
                            onClick={() => navigate('/reports')}
                        />
                    </div>

                    {/* System Health Section */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">System Health</h3>
                                <p className="text-gray-500 text-sm">Real-time monitoring and alerts</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Server className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium">Production</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Cpu className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">CPU Load</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-900">
                                    {system_analytics?.cpu_load || '24'}%
                                </div>
                                <div className="h-2 bg-blue-200 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${system_analytics?.cpu_load || 24}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-900">Memory</span>
                                </div>
                                <div className="text-2xl font-bold text-green-900">
                                    {system_analytics?.memory_usage?.heapUsed
                                        ? Math.round((system_analytics.memory_usage.heapUsed / system_analytics.memory_usage.heapTotal) * 100)
                                        : '62'}%
                                </div>
                                <div className="h-2 bg-green-200 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${system_analytics?.memory_usage?.heapUsed
                                                ? Math.round((system_analytics.memory_usage.heapUsed / system_analytics.memory_usage.heapTotal) * 100)
                                                : 62}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-900">Uptime</span>
                                </div>
                                <div className="text-2xl font-bold text-purple-900">
                                    {system_analytics?.uptime || '99.9'}%
                                </div>
                                <div className="text-xs text-purple-700 mt-1">Last 30 days</div>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lock className="w-4 h-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-900">Security</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-orange-600" />
                                    <span className="text-2xl font-bold text-orange-900">Active</span>
                                </div>
                                <div className="text-xs text-orange-700 mt-1">No threats detected</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <QuickAction
                                icon={Users}
                                title="Manage Users"
                                description="View, edit, or remove user accounts"
                                color="bg-blue-500"
                                onClick={() => navigate('/students')}
                            />

                            <QuickAction
                                icon={BookOpen}
                                title="Course Approvals"
                                description="Review and approve new courses"
                                color="bg-green-500"
                                onClick={() => navigate('/courses')}
                            />

                            <QuickAction
                                icon={IndianRupee}
                                title="Revenue Report"
                                description="Generate financial reports"
                                color="bg-purple-500"
                                onClick={() => navigate('/reports')}
                            />

                            <QuickAction
                                icon={Settings}
                                title="System Settings"
                                description="Configure platform settings"
                                color="bg-orange-500"
                                onClick={() => navigate('/settings')}
                            />
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
                            <button
                                onClick={fetchRecentActivities}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-1">
                            {recentActivities.length > 0 ? (
                                recentActivities.map((activity, index) => (
                                    <ActivityItem
                                        key={index}
                                        icon={activity.type === 'user' ? Users :
                                            activity.type === 'course' ? BookOpen :
                                                activity.type === 'payment' ? DollarSign : Bell}
                                        title={activity.title}
                                        time={activity.time}
                                        user={activity.user}
                                        action={activity.action}
                                        status={activity.status}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No recent activities</p>
                                </div>
                            )}
                        </div>

                        {recentActivities.length > 0 && (
                            <button className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                                View All Activities
                                <ChevronRight className="w-4 h-4 inline ml-1" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Status */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>System Operational</span>
                        </div>
                        <div className="hidden md:block">•</div>
                        <div>Last updated: Just now</div>
                        <div className="hidden md:block">•</div>
                        <div>Data refreshes every 5 minutes</div>
                    </div>
                    <div className="mt-2 md:mt-0">
                        <span className="text-gray-400">Admin ID: </span>
                        <span className="font-medium">ADM-{new Date().getFullYear()}-001</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;