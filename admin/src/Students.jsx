//admin/src/Students.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    Trash2,
    UserX,
    UserCheck,
    Loader2,
    Mail,
    Filter,
    Download,
    MoreVertical,
    Eye,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Users,
    ChevronDown,
    Shield,
    Clock,
    BookOpen,
    TrendingUp,
    BarChart3,
    Calendar,
    ChevronRight,
    ExternalLink,
    Settings,
    Bell,
    MessageSquare,
    Plus,
    Upload,
    FileText,
    Edit,
    Ban,
    ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [bulkAction, setBulkAction] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        banned: 0,
        newToday: 0,
        enrolledCourses: 0
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchStudentStats();
    }, [page, statusFilter, sortBy]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/admin/users/students`, {
                params: {
                    page,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sort: sortBy,
                    search: search || undefined
                }
            });

            if (response.data.success) {
                setStudents(response.data.data);
                setTotalPages(response.data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error("Fetch students error:", error);
            toast.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentStats = async () => {
        try {
            const response = await axios.get(`${API}/admin/users/students/stats`);
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error("Fetch stats error:", error);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        if (!window.confirm(`Are you sure you want to ${newStatus === 'banned' ? 'ban' : 'activate'} this student?`)) return;

        try {
            await axios.put(`${API}/admin/users/${id}/status`, { status: newStatus });

            toast.success(`Student ${newStatus === 'banned' ? 'banned' : 'activated'} successfully`, {
                action: {
                    label: 'Undo',
                    onClick: () => handleUndoStatusChange(id, newStatus === 'banned' ? 'active' : 'banned')
                }
            });

            fetchStudents();
            fetchStudentStats();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleUndoStatusChange = async (id, originalStatus) => {
        try {
            await axios.put(`${API}/admin/users/${id}/status`, { status: originalStatus });
            toast.success('Action undone');
            fetchStudents();
            fetchStudentStats();
        } catch (error) {
            toast.error("Failed to undo action");
        }
    };

    const handleDeleteStudent = async (id, name) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${name}? This action cannot be undone.`)) return;

        try {
            await axios.delete(`${API}/admin/users/${id}`);
            toast.success('Student deleted successfully');
            fetchStudents();
            fetchStudentStats();
        } catch (error) {
            toast.error("Failed to delete student");
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedStudents.length === 0) {
            toast.error('Please select an action and at least one student');
            return;
        }

        if (!window.confirm(`Are you sure you want to ${bulkAction} ${selectedStudents.length} student(s)?`)) {
            return;
        }

        try {
            await axios.post(`${API}/admin/users/bulk-action`, {
                userIds: selectedStudents,
                action: bulkAction
            });

            toast.success(`Successfully ${bulkAction}ed ${selectedStudents.length} student(s)`);
            setSelectedStudents([]);
            setBulkAction('');
            fetchStudents();
            fetchStudentStats();
        } catch (error) {
            toast.error("Failed to perform bulk action");
        }
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === students.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(students.map(s => s.id));
        }
    };

    const handleSelectStudent = (id) => {
        if (selectedStudents.includes(id)) {
            setSelectedStudents(selectedStudents.filter(sId => sId !== id));
        } else {
            setSelectedStudents([...selectedStudents, id]);
        }
    };

    const handleExport = () => {
        toast.success('Exporting student data...');
        // Implement CSV/Excel export logic here
        // For now, triggering the backend export could be done via window.open or a properly authenticated fetch
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await axios.post(`${API}/admin/users/students`, data);
            if (response.data.success) {
                toast.success('Student created successfully');
                setShowAddModal(false);
                fetchStudents();
                fetchStudentStats();
            }
        } catch (error) {
            console.error('Add student error:', error);
            toast.error(error.response?.data?.message || 'Failed to create student');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split('\n');
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

            const students = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].split(',');
                if (row.length === headers.length) {
                    const student = {};
                    headers.forEach((header, index) => {
                        student[header] = row[index].trim();
                    });
                    // Basic validation
                    if (student.email && student.name) {
                        students.push(student);
                    }
                }
            }

            if (students.length > 0) {
                try {
                    const response = await axios.post(`${API}/admin/users/students/bulk-create`, { students });
                    if (response.data.success) {
                        toast.success(response.data.message);
                        setShowImportModal(false);
                        fetchStudents();
                        fetchStudentStats();
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    toast.error(error.response?.data?.message || 'Failed to import students');
                }
            } else {
                toast.error('No valid data found in CSV');
            }
        };
        reader.readAsText(file);
    };

    const StatusBadge = ({ status }) => {
        const safeStatus = status || 'active';
        const config = {
            active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
            inactive: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
            banned: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
            pending: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock }
        };

        const { bg, text, icon: Icon } = config[safeStatus] || config.active;

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

    // Render Student Card for Grid View
    const StudentCard = ({ student }) => (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                {student.name.charAt(0)}
                            </div>
                            {student.is_online && (
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900">{student.name}</h4>
                                {student.is_premium && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Premium
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{student.email}</p>
                            <p className="text-xs text-gray-400 mt-1">ID: {student.id}</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{student.enrolled_courses || 0}</div>
                        <div className="text-xs text-gray-500">Courses</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{student.completed_courses || 0}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <StatusBadge status={student.status} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Joined</span>
                        <span className="text-sm font-medium text-gray-900">
                            {new Date(student.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Active</span>
                        <span className="text-sm font-medium text-gray-900">
                            {student.last_active ? new Date(student.last_active).toLocaleDateString() : 'Never'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => toast.info(`Viewing ${student.name}'s profile`)}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            title="View Profile"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toast.info(`Emailing ${student.email}`)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Send Email"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {student.status !== 'banned' ? (
                            <button
                                onClick={() => handleStatusChange(student.id, 'banned')}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Ban Student"
                            >
                                <Ban className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusChange(student.id, 'active')}
                                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                title="Activate Student"
                            >
                                <UserCheck className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete Student"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
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
                    <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
                    <p className="text-gray-600 mt-2">
                        Manage student accounts, monitor activities, and oversee platform engagement
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Student
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Students"
                    value={stats.total.toLocaleString()}
                    icon={Users}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    onClick={() => setStatusFilter('all')}
                />

                <StatCard
                    title="Active"
                    value={stats.active.toLocaleString()}
                    icon={CheckCircle}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    onClick={() => setStatusFilter('active')}
                />

                <StatCard
                    title="Inactive"
                    value={stats.inactive.toLocaleString()}
                    icon={Clock}
                    color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                    onClick={() => setStatusFilter('inactive')}
                />

                <StatCard
                    title="Banned"
                    value={stats.banned.toLocaleString()}
                    icon={ShieldAlert}
                    color="bg-gradient-to-br from-red-500 to-red-600"
                    onClick={() => setStatusFilter('banned')}
                />

                <StatCard
                    title="Enrolled Courses"
                    value={stats.enrolledCourses.toLocaleString()}
                    icon={BookOpen}
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    change={stats.newToday > 0 ? 15 : -5}
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
                                className={`px-4 py-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Table
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Grid
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                            />
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={fetchStudents}
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

                        {/* Import Button */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Import
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
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="banned">Banned</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="name_asc">Name A-Z</option>
                                    <option value="name_desc">Name Z-A</option>
                                    <option value="activity">Most Active</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Items Per Page</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                    setStatusFilter('all');
                                    setSortBy('newest');
                                }}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                            >
                                Clear Filters
                            </button>
                            <button
                                onClick={fetchStudents}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedStudents.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 opacity-90" />
                            <div>
                                <p className="font-medium">
                                    {selectedStudents.length} student(s) selected
                                </p>
                                <p className="text-sm opacity-90">Choose an action to perform on selected students</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <select
                                className="px-4 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-blue-600 text-white"
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                            >
                                <option value="" className="bg-white text-gray-900">Select Action</option>
                                <option value="activate" className="bg-white text-gray-900">Activate</option>
                                <option value="deactivate" className="bg-white text-gray-900">Deactivate</option>
                                <option value="ban" className="bg-white text-gray-900">Ban</option>
                                <option value="send_email" className="bg-white text-gray-900">Send Email</option>
                                <option value="export" className="bg-white text-gray-900">Export Selected</option>
                            </select>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction}
                                    className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply
                                </button>

                                <button
                                    onClick={() => setSelectedStudents([])}
                                    className="px-4 py-2 border border-blue-400 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-600">Loading students...</p>
                    </div>
                </div>
            ) : students.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                    <button
                        onClick={() => {
                            setSearch('');
                            setStatusFilter('all');
                            fetchStudents();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset Filters
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {students.map((student) => (
                        <StudentCard key={student.id} student={student} />
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
                                            checked={selectedStudents.length === students.length && students.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Student</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Courses</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Last Active</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Joined</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(student.id)}
                                                onChange={() => handleSelectStudent(student.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    {student.is_online && (
                                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">{student.name}</p>
                                                        {student.is_premium && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                Premium
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">{student.enrolled_courses || 0}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <StatusBadge status={student.status} />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {student.last_active ? (
                                                    <>
                                                        {new Date(student.last_active).toLocaleDateString()}
                                                        <div className="text-xs text-gray-400">
                                                            {new Date(student.last_active).toLocaleTimeString()}
                                                        </div>
                                                    </>
                                                ) : (
                                                    'Never'
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {new Date(student.created_at).toLocaleDateString()}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toast.info(`Viewing ${student.name}'s profile`)}
                                                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                                    title="View Profile"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => toast.info(`Emailing ${student.email}`)}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="Send Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>

                                                {student.status !== 'banned' ? (
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'banned')}
                                                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                        title="Ban Student"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'active')}
                                                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                                        title="Activate Student"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteStudent(student.id, student.name)}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                    title="Delete Student"
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
                                Showing {students.length} of {stats.total} students
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
                                                    ? 'bg-blue-600 text-white'
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
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Add New Student</h4>
                        <p className="text-blue-100 text-sm mt-1">Manually add a student account</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Import Students</h4>
                        <p className="text-green-100 text-sm mt-1">Bulk import from CSV file</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Download className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Export Data</h4>
                        <p className="text-purple-100 text-sm mt-1">Export all student records</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Add Student Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-gray-900">Add New Student</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Create Student
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Import Students Modal */}
            {
                showImportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-gray-900">Import Students</h3>
                                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-colors bg-gray-50">
                                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-2">Drag and drop your CSV file here</p>
                                    <p className="text-xs text-gray-500 mb-4">name, email, password, phone</p>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label
                                        htmlFor="csv-upload"
                                        className="inline-block px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm"
                                    >
                                        Browse Files
                                    </label>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                                    <div className="p-1 bg-blue-100 rounded text-blue-600 mt-0.5">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-900">CSV Format Required</h4>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Your file must include headers: <code className="bg-blue-100 px-1 py-0.5 rounded">name</code>, <code className="bg-blue-100 px-1 py-0.5 rounded">email</code>, <code className="bg-blue-100 px-1 py-0.5 rounded">password</code>
                                        </p>
                                        <button
                                            onClick={() => {
                                                const csvContent = "data:text/csv;charset=utf-8,name,email,password,phone\nJohn Doe,john@example.com,Password123,+1234567890";
                                                const encodedUri = encodeURI(csvContent);
                                                const link = document.createElement("a");
                                                link.setAttribute("href", encodedUri);
                                                link.setAttribute("download", "student_import_template.csv");
                                                document.body.appendChild(link);
                                                link.click();
                                            }}
                                            className="text-xs font-semibold text-blue-700 hover:underline mt-2 inline-block"
                                        >
                                            Download Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Students;