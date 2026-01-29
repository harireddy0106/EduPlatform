//admin/src/Courses.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    ExternalLink,
    CheckCircle,
    XCircle,
    Eye,
    Loader2,
    BookOpen,
    Filter,
    Download,
    MoreVertical,
    TrendingUp,
    AlertTriangle,
    Clock,
    Users,
    DollarSign,
    Star,
    BarChart3,
    Calendar,
    ChevronDown,
    ChevronRight,
    Edit,
    Trash2,
    Copy,
    Shield,
    Award,
    Tag,
    RefreshCw,
    PlayCircle,
    FileText,
    Percent,
    TrendingDown,
    Check,
    X,
    Plus,
    Upload,
    Globe,
    Lock,
    Unlock,
    DownloadCloud,
    Printer,
    Grid,
    List
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        draft: 0,
        pending: 0,
        totalStudents: 0,
        totalRevenue: 0,
        averageRating: 0
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('newest');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        fetchCourses();
        fetchCourseStats();
    }, [filter, page, sortBy]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/admin/courses`, {
                params: {
                    page,
                    status: filter !== 'all' ? filter : undefined,
                    sort: sortBy,
                    search: search || undefined,
                    limit: viewMode === 'grid' ? 12 : 20
                }
            });

            if (response.data.success) {
                setCourses(response.data.data);
                setTotalPages(response.data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error("Fetch courses error:", error);
            toast.error("Failed to load courses");
        } finally {
            setLoading(false);
        }
    };

    const fetchCourseStats = async () => {
        try {
            const response = await axios.get(`${API}/admin/courses/stats`);
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error("Fetch stats error:", error);
        }
    };

    const handleStatusChange = async (id, newStatus, title) => {
        const actionMap = {
            'published': 'publish',
            'draft': 'unpublish',
            'pending': 'approve',
            'rejected': 'reject'
        };

        const action = actionMap[newStatus] || 'update';

        if (!window.confirm(`Are you sure you want to ${action} "${title}"?`)) return;

        try {
            await axios.put(`${API}/admin/courses/${id}/status`, { status: newStatus });

            toast.success(`Course ${action}ed successfully`, {
                action: {
                    label: 'Undo',
                    onClick: () => handleUndoStatusChange(id, newStatus)
                }
            });

            fetchCourses();
            fetchCourseStats();
        } catch (error) {
            toast.error("Failed to update course status");
        }
    };

    const handleUndoStatusChange = async (id, originalStatus) => {
        try {
            const previousStatus = originalStatus === 'published' ? 'draft' : 'published';
            await axios.put(`${API}/admin/courses/${id}/status`, { status: previousStatus });
            toast.success('Action undone');
            fetchCourses();
            fetchCourseStats();
        } catch (error) {
            toast.error("Failed to undo action");
        }
    };

    const handleDeleteCourse = async (id, title) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${title}"? This action cannot be undone.`)) return;

        try {
            await axios.delete(`${API}/admin/courses/${id}`);
            toast.success('Course deleted successfully');
            fetchCourses();
            fetchCourseStats();
        } catch (error) {
            toast.error("Failed to delete course");
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedCourses.length === 0) {
            toast.error('Please select an action and at least one course');
            return;
        }

        if (!window.confirm(`Are you sure you want to ${bulkAction} ${selectedCourses.length} course(s)?`)) {
            return;
        }

        try {
            await axios.post(`${API}/admin/courses/bulk-action`, {
                courseIds: selectedCourses,
                action: bulkAction
            });

            toast.success(`Successfully ${bulkAction}ed ${selectedCourses.length} course(s)`);
            setSelectedCourses([]);
            setBulkAction('');
            fetchCourses();
            fetchCourseStats();
        } catch (error) {
            toast.error("Failed to perform bulk action");
        }
    };

    const handleSelectAll = () => {
        if (selectedCourses.length === courses.length) {
            setSelectedCourses([]);
        } else {
            setSelectedCourses(courses.map(c => c.id));
        }
    };

    const handleSelectCourse = (id) => {
        if (selectedCourses.includes(id)) {
            setSelectedCourses(selectedCourses.filter(cId => cId !== id));
        } else {
            setSelectedCourses([...selectedCourses, id]);
        }
    };

    const handlePreviewCourse = (course) => {
        setSelectedCourse(course);
        setShowPreviewModal(true);
    };

    const handleExport = async () => {
        try {
            toast.promise(
                axios.get(`${API}/admin/courses/export`, { responseType: 'blob' }),
                {
                    loading: 'Preparing export...',
                    success: (response) => {
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `courses_export_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        return 'Export downloaded successfully';
                    },
                    error: 'Failed to export data'
                }
            );
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const StatusBadge = ({ status }) => {
        const safeStatus = status || 'draft';
        const config = {
            published: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
            draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertTriangle },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
        };

        const { bg, text, icon: Icon } = config[safeStatus] || config.draft;

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
                            {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
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

    const CourseCard = ({ course }) => (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="relative">
                <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-blue-600 rounded-t-xl overflow-hidden">
                    {course.thumbnail_url ? (
                        <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/80">
                            <BookOpen className="w-16 h-16" />
                        </div>
                    )}
                </div>

                <div className="absolute top-4 left-4">
                    <StatusBadge status={course.status} />
                </div>

                <div className="absolute top-4 right-4">
                    <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => handleSelectCourse(course.id)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 bg-white"
                    />
                </div>
            </div>

            <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 truncate">{course.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 truncate">By {course.instructor_name}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                            ₹{course.price?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-gray-500">Price</div>
                    </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{course.short_description || course.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className="w-4 h-4 text-blue-500" />
                            <div className="text-lg font-bold text-gray-900">{course.enrolled_students || 0}</div>
                        </div>
                        <div className="text-xs text-gray-500">Students</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <div className="text-lg font-bold text-gray-900">{course.rating || '4.5'}</div>
                        </div>
                        <div className="text-xs text-gray-500">Rating</div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{course.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        <span>{course.total_lessons || 0} lessons</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePreviewCourse(course)}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            title="Preview Course"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toast.info(`Editing ${course.title}`)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Edit Course"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {course.status === 'pending' || course.status === 'draft' ? (
                            <button
                                onClick={() => handleStatusChange(course.id, 'published', course.title)}
                                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                title="Publish Course"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusChange(course.id, 'draft', course.title)}
                                className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                                title="Unpublish Course"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}

                        <button
                            onClick={() => handleDeleteCourse(course.id, course.title)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete Course"
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
                    <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-gray-600 mt-2">
                        Review, approve, and manage courses. Monitor course performance and student engagement.
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
                        onClick={() => toast.info('Add new course feature')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Course
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Courses"
                    value={stats.total.toLocaleString()}
                    icon={BookOpen}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    onClick={() => setFilter('all')}
                />

                <StatCard
                    title="Published"
                    value={stats.published.toLocaleString()}
                    icon={CheckCircle}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    onClick={() => setFilter('published')}
                />

                <StatCard
                    title="Pending Review"
                    value={stats.pending.toLocaleString()}
                    icon={AlertTriangle}
                    color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                    onClick={() => setFilter('pending')}
                />

                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    change={25}
                />
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search courses..."
                                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchCourses()}
                            />
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={fetchCourses}
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
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending Review</option>
                                    <option value="rejected">Rejected</option>
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
                                    <option value="title_asc">Title A-Z</option>
                                    <option value="title_desc">Title Z-A</option>
                                    <option value="rating">Highest Rating</option>
                                    <option value="students">Most Students</option>
                                    <option value="price_high">Price: High to Low</option>
                                    <option value="price_low">Price: Low to High</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value=""
                                    onChange={() => { }}
                                >
                                    <option value="">All Categories</option>
                                    <option value="programming">Programming</option>
                                    <option value="design">Design</option>
                                    <option value="business">Business</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="personal_development">Personal Development</option>
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
                                onClick={fetchCourses}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedCourses.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 opacity-90" />
                            <div>
                                <p className="font-medium">
                                    {selectedCourses.length} course(s) selected
                                </p>
                                <p className="text-sm opacity-90">Choose an action to perform on selected courses</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <select
                                className="px-4 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-blue-600 text-white"
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                            >
                                <option value="" className="bg-white text-gray-900">Select Action</option>
                                <option value="publish" className="bg-white text-gray-900">Publish</option>
                                <option value="unpublish" className="bg-white text-gray-900">Unpublish</option>
                                <option value="approve" className="bg-white text-gray-900">Approve</option>
                                <option value="reject" className="bg-white text-gray-900">Reject</option>
                                <option value="delete" className="bg-white text-gray-900">Delete</option>
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
                                    onClick={() => setSelectedCourses([])}
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
                        <p className="text-gray-600">Loading courses...</p>
                    </div>
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                    <button
                        onClick={() => {
                            setSearch('');
                            setFilter('all');
                            fetchCourses();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset Filters
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedCourses.length === courses.length && courses.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Course</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Instructor</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Students</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Rating</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Price</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(course.id)}
                                                onChange={() => handleSelectCourse(course.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden flex-shrink-0">
                                                    {course.thumbnail_url ? (
                                                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white">
                                                            <BookOpen className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                                                    <p className="text-xs text-gray-500 truncate">{course.category}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{course.instructor_name}</div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium">{course.enrolled_students || 0}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                                <span className="font-medium">{course.rating || '4.5'}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <StatusBadge status={course.status} />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{course.price?.toLocaleString() || '0'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handlePreviewCourse(course)}
                                                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                                    title="Preview Course"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <Link
                                                    to={`/admin/courses/${course.id}`}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="Edit Course"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>

                                                {course.status === 'pending' || course.status === 'draft' ? (
                                                    <button
                                                        onClick={() => handleStatusChange(course.id, 'published', course.title)}
                                                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                                        title="Publish Course"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusChange(course.id, 'draft', course.title)}
                                                        className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                                                        title="Unpublish Course"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
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
                                Showing {courses.length} of {stats.total} courses
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
                    onClick={() => toast.info('Analytics dashboard feature')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Course Analytics</h4>
                        <p className="text-purple-100 text-sm mt-1">View detailed course performance metrics</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => toast.info('Pending reviews feature')}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Pending Reviews</h4>
                        <p className="text-yellow-100 text-sm mt-1">
                            {stats.pending} course{stats.pending !== 1 ? 's' : ''} awaiting approval
                        </p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all text-left group"
                >
                    <div className="p-3 bg-white/20 rounded-lg">
                        <DownloadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Export Reports</h4>
                        <p className="text-green-100 text-sm mt-1">Generate comprehensive course reports</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
            {/* Course Details Modal */}
            {showPreviewModal && selectedCourse && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Course Details</h3>
                            <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-1/3">
                                    <div className="bg-gray-100 rounded-lg aspect-video w-full overflow-hidden mb-4">
                                        {selectedCourse.thumbnail_url ? (
                                            <img src={selectedCourse.thumbnail_url} alt={selectedCourse.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <BookOpen className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedCourse.title}</h2>
                                    <p className="text-gray-500 text-sm mb-4">By {selectedCourse.instructor_name}</p>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <StatusBadge status={selectedCourse.status} />
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            <Tag className="w-3 h-3" /> {selectedCourse.category}
                                        </span>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm text-blue-800 font-semibold mb-1">Pricing</p>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {selectedCourse.price === 0 ? 'Free' : `₹${selectedCourse.price?.toLocaleString()}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full md:w-2/3 space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-gray-500" /> Description
                                        </h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {selectedCourse.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 border rounded-lg text-center">
                                            <div className="font-bold text-lg text-gray-900">{selectedCourse.enrolled_students}</div>
                                            <div className="text-xs text-gray-500">Students</div>
                                        </div>
                                        <div className="p-3 border rounded-lg text-center">
                                            <div className="font-bold text-lg text-gray-900">{selectedCourse.total_lessons}</div>
                                            <div className="text-xs text-gray-500">Lessons</div>
                                        </div>
                                        <div className="p-3 border rounded-lg text-center">
                                            <div className="font-bold text-lg text-gray-900 flex items-center justify-center gap-1">
                                                {selectedCourse.rating || '4.5'} <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                            </div>
                                            <div className="text-xs text-gray-500">Rating</div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-gray-500" /> Curriculum Preview
                                        </h4>
                                        <div className="border rounded-lg divide-y bg-gray-50 max-h-48 overflow-y-auto p-4 text-center text-sm text-gray-500">
                                            Feature to view full curriculum coming soon.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                            >
                                Close
                            </button>
                            <a
                                href={`${API.replace('/api', '')}/course/${selectedCourse.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium flex items-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" /> View on Platform
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Courses;