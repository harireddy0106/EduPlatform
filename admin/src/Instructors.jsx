//admin/src/Instructors.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Check,
    X,
    Search,
    Filter,
    MoreVertical,
    Shield,
    FileText,
    Loader2,
    Trash2,
    UserCheck,
    Download,
    RefreshCw,
    Users,
    ChevronDown,
    Eye,
    Mail,
    Award,
    BookOpen,
    TrendingUp,
    AlertTriangle,
    Clock,
    CheckCircle,
    XCircle,
    BarChart3,
    Calendar,
    ChevronRight,
    ExternalLink,
    Plus,
    Upload,
    MessageSquare,
    Star,
    GraduationCap,
    DollarSign,
    Edit,
    Ban,
    ShieldCheck,
    FileCheck,
    AlertCircle,
    DownloadCloud,
    Printer,
    ShieldAlert,
    UserX
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Instructors = () => {
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedInstructors, setSelectedInstructors] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        active: 0,
        suspended: 0,
        rejected: 0,
        totalCourses: 0,
        totalRevenue: 0
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('table');
    const [sortBy, setSortBy] = useState('newest');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState(null);

    useEffect(() => {
        fetchInstructors();
        fetchInstructorStats();
    }, [filter, page, sortBy]);

    const fetchInstructors = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/admin/instructors`, {
                params: {
                    page,
                    status: filter !== 'all' ? filter : undefined,
                    sort: sortBy,
                    search: search || undefined
                }
            });

            if (response.data.success) {
                setInstructors(response.data.data);
                setTotalPages(response.data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error("Fetch instructors error:", error);
            toast.error("Failed to fetch instructors");
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructorStats = async () => {
        try {
            const response = await axios.get(`${API}/admin/instructors/stats`);
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error("Fetch stats error:", error);
        }
    };

    const handleStatusChange = async (id, newStatus, name) => {
        const actionMap = {
            'active': 'approve',
            'rejected': 'reject',
            'suspended': 'suspend',
            'pending': 'pending'
        };

        const action = actionMap[newStatus] || 'update';

        if (!window.confirm(`Are you sure you want to ${action} ${name}?`)) return;

        try {
            await axios.put(`${API}/admin/instructors/${id}/status`, { status: newStatus });

            toast.success(`Instructor ${action}ed successfully`, {
                action: {
                    label: 'Undo',
                    onClick: () => handleUndoStatusChange(id, newStatus)
                }
            });

            fetchInstructors();
            fetchInstructorStats();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleUndoStatusChange = async (id, originalStatus) => {
        try {
            // Determine previous status
            const previousStatus = originalStatus === 'active' ? 'pending' : 'active';
            await axios.put(`${API}/admin/instructors/${id}/status`, { status: previousStatus });
            toast.success('Action undone');
            fetchInstructors();
            fetchInstructorStats();
        } catch (error) {
            toast.error("Failed to undo action");
        }
    };

    const handleDeleteInstructor = async (id, name) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${name}? This action cannot be undone.`)) return;

        try {
            await axios.delete(`${API}/admin/instructors/${id}`);
            toast.success('Instructor deleted successfully');
            fetchInstructors();
            fetchInstructorStats();
        } catch (error) {
            toast.error("Failed to delete instructor");
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedInstructors.length === 0) {
            toast.error('Please select an action and at least one instructor');
            return;
        }

        if (!window.confirm(`Are you sure you want to ${bulkAction} ${selectedInstructors.length} instructor(s)?`)) {
            return;
        }

        try {
            await axios.post(`${API}/admin/instructors/bulk-action`, {
                instructorIds: selectedInstructors,
                action: bulkAction
            });

            toast.success(`Successfully ${bulkAction}ed ${selectedInstructors.length} instructor(s)`);
            setSelectedInstructors([]);
            setBulkAction('');
            fetchInstructors();
            fetchInstructorStats();
        } catch (error) {
            toast.error("Failed to perform bulk action");
        }
    };

    const handleSelectAll = () => {
        if (selectedInstructors.length === instructors.length) {
            setSelectedInstructors([]);
        } else {
            setSelectedInstructors(instructors.map(i => i.id));
        }
    };

    const handleSelectInstructor = (id) => {
        if (selectedInstructors.includes(id)) {
            setSelectedInstructors(selectedInstructors.filter(iId => iId !== id));
        } else {
            setSelectedInstructors([...selectedInstructors, id]);
        }
    };

    const handleReviewInstructor = (instructor) => {
        setSelectedInstructor(instructor);
        setShowReviewModal(true);
    };

    const handleExport = () => {
        toast.success('Exporting instructor data...');
        // Implement CSV/Excel export logic here
    };

    const StatusBadge = ({ status }) => {
        const safeStatus = status || 'pending';
        const config = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
            active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
            suspended: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
            rejected: { bg: 'bg-gray-100', text: 'text-gray-800', icon: X }
        };

        const { bg, text, icon: Icon } = config[safeStatus] || config.pending;

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
                <Icon className="w-3 h-3" />
                {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
            </span>
        );
    };

    const StatCard = ({ title, value, change, icon: Icon, color, onClick }) => (
        <div
            onClick={onClick}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                    {change !== undefined && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-3 ${change > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {Math.abs(change)}% {change > 0 ? 'increase' : 'decrease'}
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    const InstructorCard = ({ instructor }) => (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                {instructor.name.charAt(0)}
                            </div>
                            {instructor.is_verified && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900">{instructor.name}</h4>
                                {instructor.is_featured && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Featured
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{instructor.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-sm text-gray-700">{instructor.rating || '4.5'}</span>
                                <span className="text-xs text-gray-500">({instructor.total_reviews || 0} reviews)</span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={selectedInstructors.includes(instructor.id)}
                        onChange={() => handleSelectInstructor(instructor.id)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{instructor.total_courses || 0}</div>
                        <div className="text-xs text-gray-500">Courses</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{instructor.total_students || 0}</div>
                        <div className="text-xs text-gray-500">Students</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <StatusBadge status={instructor.status} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Joined</span>
                        <span className="text-sm font-medium text-gray-900">
                            {new Date(instructor.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Revenue</span>
                        <span className="text-sm font-medium text-gray-900">
                            ₹{instructor.total_revenue?.toLocaleString() || '0'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleReviewInstructor(instructor)}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            title="View Details"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toast.info(`Emailing ${instructor.email}`)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Send Email"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {instructor.status === 'pending' && (
                            <>
                                <button
                                    onClick={() => handleStatusChange(instructor.id, 'active', instructor.name)}
                                    className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                    title="Approve"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleStatusChange(instructor.id, 'rejected', instructor.name)}
                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                    title="Reject"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        {instructor.status === 'active' && (
                            <button
                                onClick={() => handleStatusChange(instructor.id, 'suspended', instructor.name)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Suspend"
                            >
                                <Ban className="w-4 h-4" />
                            </button>
                        )}

                        {instructor.status === 'suspended' && (
                            <button
                                onClick={() => handleStatusChange(instructor.id, 'active', instructor.name)}
                                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                title="Activate"
                            >
                                <UserCheck className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Instructor Management</h1>
                    <p className="text-gray-600 mt-2">
                        Review, approve, and manage instructors. Monitor their performance and activities.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>

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
                    title="Total Instructors"
                    value={stats.total.toLocaleString()}
                    icon={Users}
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    onClick={() => setFilter('all')}
                />

                <StatCard
                    title="Pending Review"
                    value={stats.pending.toLocaleString()}
                    icon={Clock}
                    color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                    onClick={() => setFilter('pending')}
                />

                <StatCard
                    title="Active"
                    value={stats.active.toLocaleString()}
                    icon={CheckCircle}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    onClick={() => setFilter('active')}
                />

                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    change={15}
                />
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-4 py-2 ${viewMode === 'table' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Table
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Grid
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search instructors..."
                                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none w-64"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchInstructors()}
                            />
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={fetchInstructors}
                            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Filters Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending Review</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="name_asc">Name A-Z</option>
                                    <option value="name_desc">Name Z-A</option>
                                    <option value="rating">Highest Rating</option>
                                    <option value="courses">Most Courses</option>
                                    <option value="revenue">Highest Revenue</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Items Per Page</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    value="20"
                                    onChange={() => { }}
                                >
                                    <option value="10">10 per page</option>
                                    <option value="20">20 per page</option>
                                    <option value="50">50 per page</option>
                                    <option value="100">100 per page</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setFilter('all');
                                    setSortBy('newest');
                                }}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                            >
                                Clear Filters
                            </button>
                            <button
                                onClick={fetchInstructors}
                                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedInstructors.length > 0 && (
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <GraduationCap className="w-5 h-5 opacity-90" />
                            <div>
                                <p className="font-medium">
                                    {selectedInstructors.length} instructor(s) selected
                                </p>
                                <p className="text-sm opacity-90">Choose an action to perform on selected instructors</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <select
                                className="px-4 py-2 border border-purple-400 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none bg-purple-600 text-white"
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                            >
                                <option value="" className="bg-white text-gray-900">Select Action</option>
                                <option value="approve" className="bg-white text-gray-900">Approve</option>
                                <option value="reject" className="bg-white text-gray-900">Reject</option>
                                <option value="suspend" className="bg-white text-gray-900">Suspend</option>
                                <option value="activate" className="bg-white text-gray-900">Activate</option>
                                <option value="send_email" className="bg-white text-gray-900">Send Email</option>
                                <option value="export" className="bg-white text-gray-900">Export Selected</option>
                            </select>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction}
                                    className="px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply
                                </button>

                                <button
                                    onClick={() => setSelectedInstructors([])}
                                    className="px-4 py-2 border border-purple-400 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                        <p className="text-gray-600">Loading instructors...</p>
                    </div>
                </div>
            ) : instructors.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
                    <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No instructors found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                    <button
                        onClick={() => {
                            setSearch('');
                            setFilter('all');
                            fetchInstructors();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset Filters
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {instructors.map((instructor) => (
                        <InstructorCard key={instructor.id} instructor={instructor} />
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedInstructors.length === instructors.length && instructors.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Instructor</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Courses</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Rating</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Revenue</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {instructors.map((instructor) => (
                                    <tr key={instructor.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedInstructors.includes(instructor.id)}
                                                onChange={() => handleSelectInstructor(instructor.id)}
                                                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                            />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                        {instructor.name.charAt(0)}
                                                    </div>
                                                    {instructor.is_verified && (
                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <ShieldCheck className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">{instructor.name}</p>
                                                        {instructor.is_featured && (
                                                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">{instructor.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">{instructor.total_courses || 0}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                                <span className="font-medium text-gray-900">{instructor.rating || '4.5'}</span>
                                                <span className="text-xs text-gray-500">({instructor.total_reviews || 0})</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <StatusBadge status={instructor.status} />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{instructor.total_revenue?.toLocaleString() || '0'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleReviewInstructor(instructor)}
                                                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => toast.info(`Emailing ${instructor.email}`)}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="Send Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>

                                                {instructor.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(instructor.id, 'active', instructor.name)}
                                                            className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(instructor.id, 'rejected', instructor.name)}
                                                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                {instructor.status === 'active' && (
                                                    <button
                                                        onClick={() => handleStatusChange(instructor.id, 'suspended', instructor.name)}
                                                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                        title="Suspend"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {instructor.status === 'suspended' && (
                                                    <button
                                                        onClick={() => handleStatusChange(instructor.id, 'active', instructor.name)}
                                                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                                        title="Activate"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteInstructor(instructor.id, instructor.name)}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                Showing {instructors.length} of {stats.total} instructors
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-10 h-10 rounded-lg ${page === pageNum
                                                    ? 'bg-purple-600 text-white'
                                                    : 'hover:bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => toast.info('Pending approvals feature')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Pending Approvals</h4>
                        <p className="text-yellow-100 text-sm mt-1">
                            {stats.pending} instructor{stats.pending !== 1 ? 's' : ''} awaiting review
                        </p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => toast.info('Performance analytics feature')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Performance Analytics</h4>
                        <p className="text-green-100 text-sm mt-1">View instructor performance metrics</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <DownloadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Export Reports</h4>
                        <p className="text-purple-100 text-sm mt-1">Generate detailed instructor reports</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
            {/* Review Instructor Modal */}
            {showReviewModal && selectedInstructor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Instructor Details</h3>
                            <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="flex items-start gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shrink-0">
                                    {selectedInstructor.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                                {selectedInstructor.name}
                                                {selectedInstructor.is_verified && <ShieldCheck className="w-5 h-5 text-blue-500" />}
                                            </h2>
                                            <p className="text-gray-500 flex items-center gap-2 mt-1">
                                                <Mail className="w-4 h-4" /> {selectedInstructor.email}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="flex items-center gap-1 text-yellow-600 font-medium text-sm">
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                    {selectedInstructor.rating || '4.5'}
                                                </span>
                                                <span className="text-gray-400 text-sm">•</span>
                                                <span className="text-sm text-gray-500">Joined {new Date(selectedInstructor.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <StatusBadge status={selectedInstructor.status} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-6">
                                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                                            <div className="text-xl font-bold text-purple-700">{selectedInstructor.total_courses || 0}</div>
                                            <div className="text-xs text-purple-600 font-medium">Courses Created</div>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                                            <div className="text-xl font-bold text-blue-700">{selectedInstructor.total_students || 0}</div>
                                            <div className="text-xs text-blue-600 font-medium">Students Enrolled</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-lg text-center">
                                            <div className="text-xl font-bold text-green-700">₹{selectedInstructor.total_revenue?.toLocaleString() || '0'}</div>
                                            <div className="text-xs text-green-600 font-medium">Total Revenue</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Verification Documents
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-purple-200 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-purple-100 transition-colors">
                                                    <FileText className="w-5 h-5 text-gray-500 group-hover:text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Resume/CV</p>
                                                    <p className="text-xs text-gray-500">{selectedInstructor.resume_url ? 'Uploaded' : 'Not uploaded'}</p>
                                                </div>
                                            </div>
                                            {selectedInstructor.resume_url && (
                                                <a
                                                    href={selectedInstructor.resume_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-purple-200 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-purple-100 transition-colors">
                                                    <Shield className="w-5 h-5 text-gray-500 group-hover:text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">ID Proof</p>
                                                    <p className="text-xs text-gray-500">{selectedInstructor.id_proof_url ? 'Uploaded' : 'Not uploaded'}</p>
                                                </div>
                                            </div>
                                            {selectedInstructor.id_proof_url && (
                                                <a
                                                    href={selectedInstructor.id_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                            >
                                Close
                            </button>

                            {selectedInstructor.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => {
                                            handleStatusChange(selectedInstructor.id, 'rejected', selectedInstructor.name);
                                            setShowReviewModal(false);
                                        }}
                                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Reject
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleStatusChange(selectedInstructor.id, 'active', selectedInstructor.name);
                                            setShowReviewModal(false);
                                        }}
                                        className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium flex items-center gap-2 shadow-sm"
                                    >
                                        <Check className="w-4 h-4" /> Approve Instructor
                                    </button>
                                </>
                            )}

                            {selectedInstructor.status === 'active' && (
                                <button
                                    onClick={() => {
                                        handleStatusChange(selectedInstructor.id, 'suspended', selectedInstructor.name);
                                        setShowReviewModal(false);
                                    }}
                                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-2"
                                >
                                    <Ban className="w-4 h-4" /> Suspend Account
                                </button>
                            )}

                            {selectedInstructor.status === 'suspended' && (
                                <button
                                    onClick={() => {
                                        handleStatusChange(selectedInstructor.id, 'active', selectedInstructor.name);
                                        setShowReviewModal(false);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium flex items-center gap-2 shadow-sm"
                                >
                                    <UserCheck className="w-4 h-4" /> Reactivate Account
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Instructors;