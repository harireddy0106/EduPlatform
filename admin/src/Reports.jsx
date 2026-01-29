//admin/src/Reports.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart3,
    PieChart,
    LineChart,
    TrendingUp,
    TrendingDown,
    Download,
    Filter,
    Calendar,
    RefreshCw,
    Loader2,
    DollarSign,
    Users,
    BookOpen,
    Award,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    ChevronRight,
    Eye,
    Printer,
    FileText,
    DownloadCloud,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Activity,
    Globe,
    CreditCard,
    UserCheck,
    UserX,
    Target,
    Percent,
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
    MoreVertical,
    Search,
    Settings,
    PlayCircle,
    CheckSquare,
    XSquare,
    UserPlus,
    ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    LineChart as RechartsLineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [timeRange, setTimeRange] = useState('30d');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedReport, setSelectedReport] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalUsers: 0,
        totalCourses: 0,
        totalInstructors: 0,
        activeUsers: 0,
        conversionRate: 0,
        averageRating: 0,
        pendingApprovals: 0
    });
    const [chartData, setChartData] = useState({
        revenue: [],
        users: [],
        courses: [],
        geography: [],
        categories: []
    });
    const [topCourses, setTopCourses] = useState([]);
    const [generatedReports, setGeneratedReports] = useState([]);

    useEffect(() => {
        fetchReportData();
        fetchGeneratedReports();
    }, [timeRange]);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const [statsRes, revenueRes, usersRes] = await Promise.all([
                axios.get(`${API}/admin/reports/stats?period=${timeRange}`),
                axios.get(`${API}/admin/reports/revenue-trend?period=${timeRange}`),
                axios.get(`${API}/admin/reports/user-growth?period=${timeRange}`)
            ]);

            if (statsRes.data.success) {
                setStats(statsRes.data.data);
                if (statsRes.data.data.topCourses) {
                    setTopCourses(statsRes.data.data.topCourses);
                }
                if (statsRes.data.data.categoryDistribution) {
                    setChartData(prev => ({ ...prev, categories: statsRes.data.data.categoryDistribution }));
                }
            }
            if (revenueRes.data.success) {
                setChartData(prev => ({ ...prev, revenue: revenueRes.data.data }));
            }
            if (usersRes.data.success) {
                setChartData(prev => ({ ...prev, users: usersRes.data.data }));
            }
        } catch (error) {
            console.error("Fetch report data error:", error);
            toast.error("Failed to load report data");
        } finally {
            setLoading(false);
        }
    };

    const fetchGeneratedReports = async () => {
        try {
            const response = await axios.get(`${API}/admin/reports/generated`);
            if (response.data.success) {
                setGeneratedReports(response.data.reports);
            }
        } catch (error) {
            console.error("Fetch generated reports error:", error);
        }
    };

    const handleGenerateReport = async (type) => {
        try {
            toast.loading(`Generating ${type} report...`);
            const response = await axios.post(`${API}/admin/reports/generate`, {
                type,
                period: timeRange,
                format: 'pdf'
            });

            if (response.data.success) {
                toast.success(`${type} report generated successfully`);
                fetchGeneratedReports();
            }
        } catch (error) {
            toast.error("Failed to generate report");
        }
    };

    const handleExportReport = (reportId, format) => {
        toast.success(`Exporting report in ${format.toUpperCase()} format...`);
        // Implement export logic
    };

    const StatCard = ({ title, value, change, icon: Icon, color, trend = 'up' }) => (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                    {change !== undefined && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-3 ${trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {trend === 'up' ? <TrendingUpIcon className="w-3 h-3 mr-1" /> : <TrendingDownIcon className="w-3 h-3 mr-1" />}
                            {Math.abs(change)}% {trend === 'up' ? 'increase' : 'decrease'}
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    const ReportCard = ({ title, description, icon: Icon, color, onGenerate }) => (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="p-6">
                <div className={`p-3 rounded-lg ${color} inline-block mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
                <p className="text-sm text-gray-500 mb-6">{description}</p>
                <button
                    onClick={() => onGenerate(title.toLowerCase())}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
                >
                    Generate Report
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const GeneratedReportItem = ({ report }) => (
        <div className="bg-white p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <p className="text-sm text-gray-500">
                            Generated on {new Date(report.generated_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleExportReport(report.id, 'pdf')}
                        className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                        title="Download PDF"
                    >
                        <DownloadCloud className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleExportReport(report.id, 'excel')}
                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                        title="Download Excel"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    const RevenueChart = () => (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                    <p className="text-sm text-gray-500">Daily revenue over the selected period</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                        ₹{chartData.revenue.reduce((sum, day) => sum + (day.revenue || 0), 0).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="h-80 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.revenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip
                            formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            fill="#93c5fd"
                            fillOpacity={0.3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const UserGrowthChart = () => (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">User Growth</h3>
                    <p className="text-sm text-gray-500">New user registrations over time</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Total New:</span>
                    <span className="text-lg font-bold text-gray-900">
                        {chartData.users.reduce((sum, day) => sum + (day.new_users || 0), 0).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="h-80 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.users}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip
                            formatter={(value) => [value, 'New Users']}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="new_users"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="total_users"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const CategoryDistribution = () => {
        const categoryData = chartData.categories.length > 0 ? chartData.categories : [
            { name: 'No Data', value: 1, color: '#e5e7eb' }
        ];

        return (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Course Categories</h3>
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="h-64 w-full lg:w-1/2 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3 flex-1">
                        {categoryData.map((category, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <span className="text-sm text-gray-700">{category.name}</span>
                                </div>
                                <span className="font-medium text-gray-900">{category.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
                    <p className="text-gray-600 mt-2">
                        Comprehensive platform analytics, performance metrics, and automated reporting
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-300 rounded-lg">
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
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    change={15.2}
                    icon={DollarSign}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    trend="up"
                />

                <StatCard
                    title="Total Users"
                    value={stats.totalUsers.toLocaleString()}
                    change={8.7}
                    icon={Users}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    trend="up"
                />

                <StatCard
                    title="Active Users"
                    value={stats.activeUsers.toLocaleString()}
                    change={-2.3}
                    icon={UserCheck}
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    trend="down"
                />

                <StatCard
                    title="Conversion Rate"
                    value={`${stats.conversionRate}%`}
                    change={12.5}
                    icon={Percent}
                    color="bg-gradient-to-br from-orange-500 to-orange-600"
                    trend="up"
                />
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100">
                    <div className="flex overflow-x-auto">
                        {['overview', 'revenue', 'users', 'courses', 'geographic', 'custom'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <RevenueChart />
                                <UserGrowthChart />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <CategoryDistribution />

                                {/* Quick Stats */}
                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Stats</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-600">Average Course Rating</span>
                                                <span className="font-bold text-gray-900">{stats.averageRating}/5</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-500 rounded-full"
                                                    style={{ width: `${(stats.averageRating / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-600">Course Completion Rate</span>
                                                <span className="font-bold text-gray-900">72%</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full" style={{ width: '72%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-600">Instructor Satisfaction</span>
                                                <span className="font-bold text-gray-900">88%</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: '88%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Performers */}
                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Performing Courses</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            {topCourses.length > 0 ? (
                                                topCourses.map((course, i) => (
                                                    <div key={course.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-sm">{course.title}</p>
                                                                <p className="text-xs text-gray-500">By {course.instructor_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-gray-900">₹{course.revenue.toLocaleString()}</p>
                                                            <p className="text-xs text-gray-500">Revenue</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-gray-500 text-sm">No top courses data available</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <ReportCard
                                    title="Financial Report"
                                    description="Detailed revenue, expenses, and profit analysis"
                                    icon={DollarSign}
                                    color="bg-gradient-to-br from-green-500 to-green-600"
                                    onGenerate={handleGenerateReport}
                                />

                                <ReportCard
                                    title="User Analytics"
                                    description="User growth, engagement, and behavior patterns"
                                    icon={Users}
                                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                                    onGenerate={handleGenerateReport}
                                />

                                <ReportCard
                                    title="Course Performance"
                                    description="Course ratings, completion rates, and feedback"
                                    icon={BookOpen}
                                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                                    onGenerate={handleGenerateReport}
                                />

                                <ReportCard
                                    title="Instructor Report"
                                    description="Instructor performance, earnings, and satisfaction"
                                    icon={Award}
                                    color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                                    onGenerate={handleGenerateReport}
                                />

                                <ReportCard
                                    title="Geographic Analysis"
                                    description="User distribution and engagement by region"
                                    icon={Globe}
                                    color="bg-gradient-to-br from-red-500 to-red-600"
                                    onGenerate={handleGenerateReport}
                                />

                                <ReportCard
                                    title="Security Audit"
                                    description="Platform security events and compliance"
                                    icon={Shield}
                                    color="bg-gradient-to-br from-gray-500 to-gray-600"
                                    onGenerate={handleGenerateReport}
                                />
                            </div>

                            {/* Generated Reports */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Generated Reports</h3>
                                {generatedReports.length > 0 ? (
                                    <div className="space-y-3">
                                        {generatedReports.map((report, index) => (
                                            <GeneratedReportItem key={index} report={report} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600">No reports generated yet</p>
                                        <p className="text-sm text-gray-500 mt-2">Generate your first report using the options above</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => handleGenerateReport('comprehensive')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Comprehensive Report</h4>
                        <p className="text-blue-100 text-sm mt-1">Generate full platform analytics report</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => toast.info('Scheduled reports feature')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Schedule Reports</h4>
                        <p className="text-green-100 text-sm mt-1">Automate report generation and delivery</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => toast.info('Export all feature')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <DownloadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Export All Data</h4>
                        <p className="text-purple-100 text-sm mt-1">Export complete dataset for external analysis</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Footer Status */}
            <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Data updated: Just now</span>
                        </div>
                        <div className="hidden md:block">•</div>
                        <div>Time range: Last {timeRange}</div>
                        <div className="hidden md:block">•</div>
                        <div>Data source: Production Database</div>
                    </div>
                    <div className="mt-2 md:mt-0">
                        <button
                            onClick={fetchReportData}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;