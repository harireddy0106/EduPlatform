// client/src/pages/HomePage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import {
  BookOpen,
  Trash2,
  LogOut,
  Users,
  BarChart3,
  Settings,
  Shield,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Lock,
  Unlock,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Download,
  RefreshCw,
  Bell,
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  FileText,
  Video,
  MessageSquare,
  Globe,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Target } from 'lucide-react';
import ReactPaginate from 'react-paginate';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function HomePage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // State management
  const [state, setState] = useState({
    courses: [],
    filteredCourses: [],
    users: [],
    filteredUsers: [],
    isLoading: true,
    loadingCourses: false,
    loadingUsers: false,
    showDeleteModal: false,
    itemToDelete: null,
    deleteType: null, // 'course' or 'user'
    activeTab: 'overview',
    searchTerm: '',
    userSearchTerm: '',
    filters: {
      status: 'all',
      role: 'all',
      sort: 'newest',
      dateRange: {
        start: null,
        end: null
      }
    },
    systemStats: null,
    analytics: null,
    recentActivity: [],
    notifications: [],
    selectedUser: null,
    showUserDetails: false,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 8
    },
    userPagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10
    },
    showUserMenu: false,
    faculty: [],
    loadingFaculty: false,
    selectedFaculty: null,
    showFacultyModal: false
  });

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    fetchSystemStats();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const [
        coursesRes,
        usersRes,
        analyticsRes,
        activityRes
      ] = await Promise.all([
        axios.get(`${API}/courses`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/analytics`),
        axios.get(`${API}/admin/activity`)
      ]);

      setState(prev => ({
        ...prev,
        courses: coursesRes.data.data || coursesRes.data,
        filteredCourses: coursesRes.data.data || coursesRes.data,
        users: usersRes.data.data || usersRes.data,
        filteredUsers: usersRes.data.data || usersRes.data,
        analytics: analyticsRes.data.data || analyticsRes.data,
        recentActivity: activityRes.data.data || activityRes.data,
        isLoading: false
      }));

    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Failed to load dashboard data');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Fetch system statistics
  const fetchSystemStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/system-stats`);
      setState(prev => ({
        ...prev,
        systemStats: response.data.data || response.data
      }));
    } catch (error) {
      console.error('System stats error:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setState(prev => ({
        ...prev,
        notifications: response.data.data || response.data
      }));
    } catch (error) {
      console.error('Notifications error:', error);
    }
  };

  // Handle search and filter for courses
  useEffect(() => {
    filterCourses();
  }, [state.searchTerm, state.filters, state.courses]);

  // Handle search and filter for users
  useEffect(() => {
    filterUsers();
  }, [state.userSearchTerm, state.filters, state.users]);

  const filterCourses = () => {
    let filtered = [...state.courses];

    // Apply search
    if (state.searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        course.instructor_name.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (state.filters.status !== 'all') {
      filtered = filtered.filter(course => course.status === state.filters.status);
    }

    // Apply date range filter
    if (state.filters.dateRange.start && state.filters.dateRange.end) {
      filtered = filtered.filter(course => {
        const courseDate = new Date(course.created_at);
        return courseDate >= state.filters.dateRange.start &&
          courseDate <= state.filters.dateRange.end;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (state.filters.sort) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'enrollments':
          return (b.enrolled_students || 0) - (a.enrolled_students || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / state.pagination.itemsPerPage);
    const startIndex = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
    const paginatedCourses = filtered.slice(startIndex, startIndex + state.pagination.itemsPerPage);

    setState(prev => ({
      ...prev,
      filteredCourses: paginatedCourses,
      pagination: {
        ...prev.pagination,
        totalPages,
        totalItems: filtered.length
      }
    }));
  };

  const filterUsers = () => {
    let filtered = [...state.users];

    // Apply search
    if (state.userSearchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(state.userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(state.userSearchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(state.userSearchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (state.filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === state.filters.role);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (state.filters.sort) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return a.email.localeCompare(b.email);
        default:
          return 0;
      }
    });

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / state.userPagination.itemsPerPage);
    const startIndex = (state.userPagination.currentPage - 1) * state.userPagination.itemsPerPage;
    const paginatedUsers = filtered.slice(startIndex, startIndex + state.userPagination.itemsPerPage);

    setState(prev => ({
      ...prev,
      filteredUsers: paginatedUsers,
      userPagination: {
        ...prev.userPagination,
        totalPages,
        totalItems: filtered.length
      }
    }));
  };

  // Handle page change for courses
  const handleCoursePageChange = (selectedItem) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        currentPage: selectedItem.selected + 1
      }
    }));
  };

  // Handle page change for users
  const handleUserPageChange = (selectedItem) => {
    setState(prev => ({
      ...prev,
      userPagination: {
        ...prev.userPagination,
        currentPage: selectedItem.selected + 1
      }
    }));
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterName]: value
      },
      pagination: {
        ...prev.pagination,
        currentPage: 1
      },
      userPagination: {
        ...prev.userPagination,
        currentPage: 1
      }
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateRange: { start, end }
      },
      pagination: {
        ...prev.pagination,
        currentPage: 1
      }
    }));
  };

  // Confirm delete
  const confirmDelete = (item, type) => {
    setState(prev => ({
      ...prev,
      showDeleteModal: true,
      itemToDelete: item,
      deleteType: type
    }));
  };

  // Handle delete
  const handleDelete = async () => {
    if (!state.itemToDelete) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const endpoint = state.deleteType === 'course'
        ? `${API}/courses/${state.itemToDelete.id}`
        : `${API}/admin/users/${state.itemToDelete.id}`;

      await axios.delete(endpoint);

      toast.success(`${state.deleteType === 'course' ? 'Course' : 'User'} deleted successfully`);

      // Refresh data
      if (state.deleteType === 'course') {
        fetchDashboardData();
      } else {
        const usersRes = await axios.get(`${API}/admin/users`);
        setState(prev => ({
          ...prev,
          users: usersRes.data.data || usersRes.data,
          filteredUsers: usersRes.data.data || usersRes.data
        }));
      }

      // Close modal
      setState(prev => ({
        ...prev,
        showDeleteModal: false,
        itemToDelete: null,
        deleteType: null,
        isLoading: false
      }));

    } catch (error) {
      toast.error(error.response?.data?.error?.message || `Failed to delete ${state.deleteType}`);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Toggle user status (active/suspended)
  const toggleUserStatus = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await axios.put(`${API}/admin/users/${user.id}/status`, { status: newStatus });

      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);

      // Update local state
      const updatedUsers = state.users.map(u =>
        u.id === user.id ? { ...u, status: newStatus } : u
      );

      setState(prev => ({
        ...prev,
        users: updatedUsers,
        filteredUsers: updatedUsers
      }));

    } catch {
      toast.error('Failed to update user status');
    }
  };

  // View user details
  const viewUserDetails = (user) => {
    setState(prev => ({
      ...prev,
      selectedUser: user,
      showUserDetails: true
    }));
  };

  // Handle mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId)
      }));

    } catch {
      console.error('Mark as read error');
    }
  };

  // Export data
  const exportData = async (type) => {
    try {
      const response = await axios.get(`${API}/admin/export/${type}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`${type} data exported successfully`);
    } catch {
      toast.error(`Failed to export ${type} data`);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate system health percentage
  const calculateSystemHealth = () => {
    if (!state.systemStats) return 100;

    const {
      cpu_usage = 0,
      memory_usage = 0,
      disk_usage = 0,
      active_connections = 0,
      max_connections = 100
    } = state.systemStats;

    const scores = [
      100 - Math.min(cpu_usage, 100),
      100 - Math.min(memory_usage, 100),
      100 - Math.min(disk_usage, 100),
      100 - Math.min((active_connections / max_connections) * 100, 100)
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
        ))}
      </div>
    </div>
  );

  // Fetch faculty
  const fetchFaculty = async () => {
    try {
      setState(prev => ({ ...prev, loadingFaculty: true }));
      const response = await axios.get(`${API}/students/instructors/all`);
      setState(prev => ({
        ...prev,
        faculty: response.data.data || [],
        loadingFaculty: false
      }));
    } catch (error) {
      console.error('Fetch faculty error:', error);
      toast.error('Failed to load faculty');
      setState(prev => ({ ...prev, loadingFaculty: false }));
    }
  };

  const renderFaculty = () => {
    if (state.loadingFaculty) return renderLoadingSkeleton();

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Our Faculty</h2>
          <p className="text-gray-600">Learn from expert instructors from around the world</p>
        </div>

        {state.faculty.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No instructors found</h3>
            <p className="text-gray-500">Check back later for new faculty members.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.faculty.map(instructor => (
              <div key={instructor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={instructor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&background=random`}
                      alt={instructor.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{instructor.name}</h3>
                      <p className="text-sm text-indigo-600 font-medium">{instructor.title}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 h-10">
                    {instructor.bio || "No biography available."}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Star className="w-4 h-4 text-yellow-500 mr-2" />
                      <span>{instructor.rating || 4.5} Instructor Rating</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{instructor.specialization?.length > 0 ? instructor.specialization.join(', ') : 'General'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                  <button
                    onClick={() => setState(prev => ({ ...prev, selectedFaculty: instructor, showFacultyModal: true }))}
                    className="w-full py-2 px-4 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">HomePage</h1>
            <p className="text-red-100">
              Welcome back, {user?.name}. System status: <span className="font-semibold">Operational</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">

            <button
              onClick={fetchDashboardData}
              className="px-4 py-3 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold mt-2">{state.analytics?.total_users || 0}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  +{state.analytics?.new_users_today || 0} today
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold mt-2">{state.analytics?.total_courses || 0}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  +{state.analytics?.new_courses_today || 0} today
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold mt-2">
                ₹{state.analytics?.total_revenue ? state.analytics.total_revenue.toLocaleString('en-IN') : '0'}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  ₹{state.analytics?.revenue_today || 0} today
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Health</p>
              <p className="text-3xl font-bold mt-2">{calculateSystemHealth()}%</p>
              <div className="flex items-center mt-2">
                {calculateSystemHealth() > 80 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">Healthy</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-yellow-600">Needs attention</span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl p-6 border">
        <h2 className="text-xl font-bold text-gray-800 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <Cpu className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {state.systemStats?.cpu_usage || 0}%
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(state.systemStats?.cpu_usage || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <Server className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {state.systemStats?.memory_usage || 0}%
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${Math.min(state.systemStats?.memory_usage || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Disk Usage</span>
              <HardDrive className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {state.systemStats?.disk_usage || 0}%
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${Math.min(state.systemStats?.disk_usage || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Database</span>
              <Database className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {state.systemStats?.active_connections || 0}
              </span>
              <span className="text-sm text-gray-500">connections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Recent Activity</h2>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'activity' }))}
              className="text-red-600 hover:text-red-700 font-medium flex items-center"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="bg-white rounded-xl border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.recentActivity.slice(0, 5).map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {activity.user_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {activity.user_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {activity.user_role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${activity.action_type === 'create' ? 'bg-green-100 text-green-800' :
                          activity.action_type === 'update' ? 'bg-blue-100 text-blue-800' :
                            activity.action_type === 'delete' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {activity.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{activity.description}</div>
                        {activity.target_type && (
                          <div className="text-sm text-gray-500">{activity.target_type}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(activity.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 border">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => exportData('users')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <span className="font-medium">Export Users</span>
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => exportData('courses')}
                className="w-full flex items-center justify-between p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
              >
                <span className="font-medium">Export Courses</span>
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/admin/backup')}
                className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
              >
                <span className="font-medium">System Backup</span>
                <Shield className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <span className="font-medium">System Settings</span>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-xl p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Notifications</h3>
              <Bell className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto">
              {state.notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-800">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 ml-2">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render courses tab
  const renderCourses = () => (
    <div>
      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={state.filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={state.filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="enrollments">Most Enrollments</option>
                <option value="rating">Highest Rated</option>
              </select>

              <div className="hidden md:block">
                <DatePicker
                  selected={state.filters.dateRange.start}
                  onChange={handleDateRangeChange}
                  startDate={state.filters.dateRange.start}
                  endDate={state.filters.dateRange.end}
                  selectsRange
                  placeholderText="Date Range"
                  className="px-4 py-2 border border-gray-300 rounded-lg w-48"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active filters */}
        <div className="flex flex-wrap gap-2">
          {state.filters.status !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
              Status: {state.filters.status}
              <button
                onClick={() => handleFilterChange('status', 'all')}
                className="ml-2"
              >×</button>
            </span>
          )}
          {state.searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              Search: {state.searchTerm}
              <button
                onClick={() => setState(prev => ({ ...prev, searchTerm: '' }))}
                className="ml-2"
              >×</button>
            </span>
          )}
        </div>
      </div>

      {/* Courses Grid */}
      {state.loadingCourses ? (
        renderLoadingSkeleton()
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {state.filteredCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl overflow-hidden border hover:shadow-lg transition-shadow">
                <div className="relative h-40 bg-gradient-to-br from-red-400 to-orange-500">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white opacity-80" />
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${course.status === 'published' ? 'bg-green-500 text-white' :
                      course.status === 'draft' ? 'bg-yellow-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                      {course.status}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{course.enrolled_students || 0}</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {course.instructor_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">{course.title}</h3>

                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {course.category || 'General'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {course.difficulty || 'Beginner'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(course.created_at)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Star className="w-3 h-3 mr-1" />
                        {course.rating || 'N/A'}
                      </span>
                    </div>
                    {course.price > 0 && (
                      <span className="text-sm font-semibold text-gray-800">
                        ₹{course.price}
                      </span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Manage
                    </button>
                    <button
                      onClick={() => confirmDelete(course, 'course')}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {state.pagination.totalPages > 1 && (
            <ReactPaginate
              previousLabel="Previous"
              nextLabel="Next"
              breakLabel="..."
              pageCount={state.pagination.totalPages}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handleCoursePageChange}
              containerClassName="flex items-center justify-center space-x-2"
              pageClassName="px-3 py-2 border rounded-lg hover:bg-gray-50"
              pageLinkClassName="text-gray-700"
              previousClassName="px-4 py-2 border rounded-lg hover:bg-gray-50"
              previousLinkClassName="text-gray-700"
              nextClassName="px-4 py-2 border rounded-lg hover:bg-gray-50"
              nextLinkClassName="text-gray-700"
              breakClassName="px-3 py-2"
              activeClassName="bg-red-500 text-white border-red-500"
              activeLinkClassName="text-white"
              disabledClassName="opacity-50 cursor-not-allowed"
            />
          )}
        </>
      )}

      {state.filteredCourses.length === 0 && !state.loadingCourses && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No courses found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );

  // Render users tab
  const renderUsers = () => (
    <div>
      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={state.userSearchTerm}
              onChange={(e) => setState(prev => ({ ...prev, userSearchTerm: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={state.filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={state.filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A-Z</option>
                <option value="email">Email A-Z</option>
              </select>
            </div>

            <button
              onClick={() => exportData('users')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Active filters */}
        <div className="flex flex-wrap gap-2">
          {state.filters.role !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
              Role: {state.filters.role}
              <button
                onClick={() => handleFilterChange('role', 'all')}
                className="ml-2"
              >×</button>
            </span>
          )}
          {state.userSearchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              Search: {state.userSearchTerm}
              <button
                onClick={() => setState(prev => ({ ...prev, userSearchTerm: '' }))}
                className="ml-2"
              >×</button>
            </span>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800' :
                      u.role === 'instructor' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' :
                      u.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.last_login ? formatDateTime(u.last_login) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => viewUserDetails(u)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={u.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                      >
                        {u.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => confirmDelete(u, 'user')}
                        className="text-red-600 hover:text-red-900"
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
        {state.userPagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t">
            <ReactPaginate
              previousLabel="Previous"
              nextLabel="Next"
              breakLabel="..."
              pageCount={state.userPagination.totalPages}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handleUserPageChange}
              containerClassName="flex items-center justify-center space-x-2"
              pageClassName="px-3 py-2 border rounded-lg hover:bg-gray-50"
              pageLinkClassName="text-gray-700"
              previousClassName="px-4 py-2 border rounded-lg hover:bg-gray-50"
              previousLinkClassName="text-gray-700"
              nextClassName="px-4 py-2 border rounded-lg hover:bg-gray-50"
              nextLinkClassName="text-gray-700"
              breakClassName="px-3 py-2"
              activeClassName="bg-red-500 text-white border-red-500"
              activeLinkClassName="text-white"
              disabledClassName="opacity-50 cursor-not-allowed"
            />
          </div>
        )}
      </div>

      {state.filteredUsers.length === 0 && !state.loadingUsers && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No users found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );

  // Main render
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading HomePage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Link to="/admin" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800">EduPlatform Admin</span>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1 ml-8">
                {['overview', 'courses', 'users', 'analytics', 'faculty', 'system'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setState(prev => ({ ...prev, activeTab: tab }));
                      if (tab === 'faculty') {
                        fetchFaculty();
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${state.activeTab === tab
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {state.notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {state.notifications.length}
                    </span>
                  )}
                </button>
              </div>

              {/* User profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-800">Admin: {user?.name}</p>
                  <p className="text-xs text-gray-500">System Administrator</p>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showUserMenu: !prev.showUserMenu }))}
                    className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </button>

                  {/* User dropdown */}
                  {state.showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-2">
                        <Link
                          to="/admin/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                        >
                          Admin Settings
                        </Link>
                        <Link
                          to="/admin/audit"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                        >
                          Audit Log
                        </Link>
                        <hr className="my-2" />
                        <button
                          onClick={() => {
                            setState(prev => ({ ...prev, showUserMenu: false }));
                            logout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <div className="md:hidden py-4 border-t">
            <div className="flex items-center justify-between overflow-x-auto space-x-2">
              {['overview', 'courses', 'users', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
                  className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${state.activeTab === tab
                    ? 'bg-red-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.activeTab === 'overview' && renderOverview()}
        {state.activeTab === 'courses' && renderCourses()}
        {state.activeTab === 'users' && renderUsers()}
        {state.activeTab === 'faculty' && renderFaculty()}
        {state.activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600 mb-6">This feature is under development</p>
          </div>
        )}
        {state.activeTab === 'system' && (
          <div className="text-center py-12">
            <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">System Management</h3>
            <p className="text-gray-600 mb-6">This feature is under development</p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Dialog open={state.showDeleteModal} onOpenChange={(open) => !open && setState(prev => ({ ...prev, showDeleteModal: false, itemToDelete: null, deleteType: null }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {state.deleteType === 'course' ? 'Course' : 'User'}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-center text-gray-700 mb-2">
              Are you sure you want to delete this {state.deleteType}:
            </p>
            <p className="text-center font-semibold text-lg mb-4">
              "{state.itemToDelete?.title || state.itemToDelete?.name}"
            </p>
            <p className="text-center text-sm text-gray-600 mb-6">
              This action cannot be undone. All associated data will be permanently deleted.
            </p>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setState(prev => ({
                  ...prev,
                  showDeleteModal: false,
                  itemToDelete: null,
                  deleteType: null
                }))}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={state.isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {state.isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={state.showUserDetails} onOpenChange={(open) => !open && setState(prev => ({ ...prev, showUserDetails: false, selectedUser: null }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {state.selectedUser && (
            <div className="py-4">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-2xl">
                  {state.selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{state.selectedUser.name}</h3>
                  <p className="text-gray-600">{state.selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${state.selectedUser.role === 'admin' ? 'bg-red-100 text-red-800' :
                      state.selectedUser.role === 'instructor' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                      {state.selectedUser.role}
                    </span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${state.selectedUser.status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                      }`}>
                      {state.selectedUser.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Joined</p>
                  <p className="font-medium">{formatDate(state.selectedUser.created_at)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Last Login</p>
                  <p className="font-medium">
                    {state.selectedUser.last_login ? formatDateTime(state.selectedUser.last_login) : 'Never'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">User Stats</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{state.selectedUser.stats?.courses || 0}</p>
                      <p className="text-xs text-gray-600">Courses</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{state.selectedUser.stats?.enrollments || 0}</p>
                      <p className="text-xs text-gray-600">Enrollments</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{state.selectedUser.stats?.submissions || 0}</p>
                      <p className="text-xs text-gray-600">Submissions</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => toggleUserStatus(state.selectedUser)}
                  className={`px-4 py-2 rounded-lg font-medium ${state.selectedUser.status === 'active'
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                >
                  {state.selectedUser.status === 'active' ? 'Suspend User' : 'Activate User'}
                </button>
                <button
                  onClick={() => confirmDelete(state.selectedUser, 'user')}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                >
                  Delete User
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}

      {/* Faculty Details Modal */}
      <Dialog
        open={state.showFacultyModal}
        onOpenChange={(open) => setState(prev => ({ ...prev, showFacultyModal: open }))}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {state.selectedFaculty && (
            <div>
              <DialogHeader className="mb-6">
                <div className="flex items-start gap-4">
                  <img
                    src={state.selectedFaculty.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.selectedFaculty.name)}&background=random`}
                    alt={state.selectedFaculty.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                  />
                  <div>
                    <DialogTitle className="text-2xl font-bold text-gray-900">{state.selectedFaculty.name}</DialogTitle>
                    <DialogDescription>
                      Instructor Profile Details
                    </DialogDescription>
                    <p className="text-indigo-600 font-medium">{state.selectedFaculty.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      {state.selectedFaculty.location && (
                        <span className="flex items-center">
                          📍 {state.selectedFaculty.location}
                        </span>
                      )}
                      <span>•</span>
                      <span>{state.selectedFaculty.experience} Years Exp.</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Bio */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" /> About
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{state.selectedFaculty.bio || "No biography available."}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Professional Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-500" /> Professional
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-xs text-gray-500 uppercase tracking-wide">Organization</span>
                        <span className="font-medium text-gray-900">{state.selectedFaculty.current_org || 'Not specified'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-xs text-gray-500 uppercase tracking-wide">Skills</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {state.selectedFaculty.skills?.length > 0 ? (
                            state.selectedFaculty.skills.map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">No skills listed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-500" /> Contact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          📧
                        </div>
                        <div className="overflow-hidden">
                          <span className="block text-xs text-gray-500">Email</span>
                          <a href={`mailto:${state.selectedFaculty.email}`} className="text-gray-900 hover:text-indigo-600 truncate block">
                            {state.selectedFaculty.email}
                          </a>
                        </div>
                      </div>

                      {state.selectedFaculty.linkedin && (
                        <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                            in
                          </div>
                          <div className="overflow-hidden">
                            <span className="block text-xs text-gray-500">LinkedIn</span>
                            <a href={state.selectedFaculty.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-indigo-600 truncate block">
                              View Profile
                            </a>
                          </div>
                        </div>
                      )}

                      {state.selectedFaculty.website && (
                        <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                            🌐
                          </div>
                          <div className="overflow-hidden">
                            <span className="block text-xs text-gray-500">Website</span>
                            <a href={state.selectedFaculty.website} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-indigo-600 truncate block">
                              Visit Website
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Qualifications */}
                {state.selectedFaculty.qualifications?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-500" /> Qualifications
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {state.selectedFaculty.qualifications.map((qual, index) => (
                        <div key={index} className="border border-gray-100 p-3 rounded-lg flex items-start gap-3">
                          <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{qual.title}</p>
                            <p className="text-xs text-gray-500">{qual.institute} • {qual.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default HomePage;