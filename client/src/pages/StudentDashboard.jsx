// client/src/pages/StudentDashboard.jsx

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"; // Ensure these are imported

import {
  ArrowLeft,
  RefreshCw,
  BookOpen,
  LogOut,
  Search,
  Bell,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  Filter,
  Grid,
  List,
  Star,
  Users,
  Award,
  Play,
  Bookmark,
  MoreVertical,
  Loader2,
  AlertCircle,
  Eye,
  X,
  FileText,
  Target,
  Trophy,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import ReactPaginate from 'react-paginate';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function StudentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // State management
  const [state, setState] = useState({
    allCourses: [],
    myCourses: [],
    filteredCourses: [],
    searchTerm: '',
    activeTab: localStorage.getItem('student_dashboard_tab') || 'dashboard',
    isLoading: true,
    loadingCourses: false,
    loadingMyCourses: false,
    loadingStats: false,
    notifications: [],
    stats: null,
    viewMode: localStorage.getItem('student_view_mode') || 'grid', // 'grid' or 'list'
    filters: {
      category: '',
      difficulty: '',
      sort: 'newest',
      price: 'all', // all, free, paid
      rating: ''
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 9
    },
    assignmentsView: 'overview', // overview, upcoming, completed
    completedAssignments: [],
    upcomingAssignments: [],
    recommendedCourses: [],
    recentActivity: [],
    showUserMenu: false,
    notificationsOpen: false,
    showFilters: false,
    enrollmentLoading: {},
    categories: [],
    sortOptions: [
      { value: 'newest', label: 'Newest' },
      { value: 'popular', label: 'Most Popular' },
      { value: 'rating', label: 'Highest Rated' },
      { value: 'enrollments', label: 'Most Enrolled' },
      { value: 'title_asc', label: 'Title (A-Z)' },
      { value: 'title_desc', label: 'Title (Z-A)' }
    ],
    faculty: [],
    loadingFaculty: false,
    selectedFaculty: null,
    showFacultyModal: false,
    wishlist: []
  });

  // Fetch initial data


  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
      fetchNotifications();
      fetchCategories();
      fetchWishlist(); // Fetch wishlist
      setupRealTimeUpdates();
    }

    // Cleanup
    return () => {
      if (window.dashboardRefreshInterval) {
        clearInterval(window.dashboardRefreshInterval);
      }
    };
  }, [user?.id]);

  // Persist dashboard preferences
  useEffect(() => {
    localStorage.setItem('student_dashboard_tab', state.activeTab);
    localStorage.setItem('student_view_mode', state.viewMode);
  }, [state.activeTab, state.viewMode]);

  // Setup real-time updates (WebSocket or polling)
  const setupRealTimeUpdates = () => {
    // Poll for updates every 30 seconds (in production, use WebSockets)
    window.dashboardRefreshInterval = setInterval(() => {
      fetchNotifications();
      fetchUpcomingAssignments();
    }, 30000);
  };

  // Auto-close notifications dropdown after 3 seconds
  useEffect(() => {
    let timeoutId;
    if (state.notificationsOpen) {
      timeoutId = setTimeout(() => {
        setState(prev => ({ ...prev, notificationsOpen: false }));
      }, 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state.notificationsOpen]);

  // Fetch dashboard data from database
  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const [
        myCoursesRes,
        statsRes,
        upcomingRes,
        recommendationsRes,
        activityRes
      ] = await Promise.allSettled([
        axios.get(`${API}/students/${user.id}/courses/enrolled`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/students/${user.id}/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/students/${user.id}/assignments/upcoming?limit=5`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/students/${user.id}/courses/recommended`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/students/${user.id}/activity/recent`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      // Process responses with error handling
      const myCourses = myCoursesRes.status === 'fulfilled'
        ? myCoursesRes.value.data.data || myCoursesRes.value.data || []
        : [];

      const stats = statsRes.status === 'fulfilled'
        ? statsRes.value.data.data || statsRes.value.data || {}
        : {};

      const upcomingAssignments = upcomingRes.status === 'fulfilled'
        ? upcomingRes.value.data.data || upcomingRes.value.data || []
        : [];

      const recommendedCourses = recommendationsRes.status === 'fulfilled'
        ? recommendationsRes.value.data.data || recommendationsRes.value.data || []
        : [];

      const recentActivity = activityRes.status === 'fulfilled'
        ? activityRes.value.data.data || activityRes.value.data || []
        : [];

      setState(prev => ({
        ...prev,
        myCourses,
        stats: {
          total_courses: stats.total_courses || myCourses.length,
          enrolled_courses: stats.enrolled_courses || myCourses.length,
          completed_courses: stats.completed_courses || 0,
          active_courses: stats.active_courses || myCourses.filter(c => c.enrollment?.progress < 100).length,
          average_progress: stats.average_progress || calculateAverageProgress(myCourses),
          certificates: stats.certificates || 0,
          assignments_due: stats.assignments_due || upcomingAssignments.length,
          total_hours: stats.total_hours || 0,
          learning_streak: stats.learning_streak || 0,
          daily_goal: stats.daily_goal || 0,
          active_courses_trend: stats.active_courses_trend || 0,
          certificates_trend: stats.certificates_trend || 0
        },
        upcomingAssignments,
        recommendedCourses,
        recentActivity,
        isLoading: false
      }));

    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Failed to load dashboard data');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Calculate average progress from courses
  const calculateAverageProgress = (courses) => {
    if (!courses.length) return 0;
    const total = courses.reduce((sum, course) => sum + (course.enrollment?.progress || 0), 0);
    return Math.round(total / courses.length);
  };

  // Fetch notifications from database
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`${API}/students/${user.id}/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { unread_only: true }
      });

      const notifications = response.data.data || response.data || [];

      setState(prev => ({
        ...prev,
        notifications: notifications.slice(0, 10) // Limit to 10 notifications
      }));

    } catch (error) {
      console.error('Notifications error:', error);
    }
  };

  // Fetch upcoming assignments from database
  const fetchUpcomingAssignments = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`${API}/students/${user.id}/assignments/upcoming`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const assignments = response.data.data || response.data || [];

      setState(prev => ({
        ...prev,
        upcomingAssignments: assignments.map(assignment => ({
          ...assignment,
          status: new Date(assignment.due_date) < new Date() ? 'overdue' : 'upcoming'
        }))
      }));
    } catch (error) {
      console.error('Upcoming assignments error:', error);
    }
  };

  // Fetch completed assignments
  const fetchCompletedAssignments = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API}/students/${user.id}/assignments/completed`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setState(prev => ({
        ...prev,
        completedAssignments: response.data.data || []
      }));
    } catch (error) {
      console.error('Completed assignments error:', error);
      toast.error('Failed to load completed assignments');
    }
  };

  // Fetch all available courses with filters
  const fetchCourses = useCallback(async (page = 1) => {
    if (!user?.id) return;

    try {
      setState(prev => ({ ...prev, loadingCourses: true }));

      const params = {
        page: page,
        limit: state.pagination.itemsPerPage,
        status: 'published', // Only show published courses
        ...state.filters
      };

      if (state.searchTerm) {
        params.search = state.searchTerm;
      }

      const response = await axios.get(`${API}/courses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params
      });

      const data = response.data.data || response.data || [];
      const pagination = response.data.pagination || response.data.meta || {
        page: 1,
        limit: state.pagination.itemsPerPage,
        total: data.length,
        pages: Math.ceil(data.length / state.pagination.itemsPerPage)
      };

      // Filter out courses already enrolled in
      const enrolledCourseIds = state.myCourses.map(course => course.id);
      const availableCourses = data.filter(course => !enrolledCourseIds.includes(course.id));

      setState(prev => ({
        ...prev,
        allCourses: data,
        filteredCourses: availableCourses,
        loadingCourses: false,
        pagination: {
          ...prev.pagination,
          currentPage: pagination.page || 1,
          totalPages: pagination.pages || pagination.totalPages || 1,
          totalItems: pagination.total || pagination.totalItems || data.length
        }
      }));

    } catch (error) {
      console.error('Fetch courses error:', error);
      toast.error('Failed to load courses');
      setState(prev => ({ ...prev, loadingCourses: false }));
    }
  }, [state.searchTerm, state.filters, state.pagination.itemsPerPage, state.myCourses, user?.id]);

  // Fetch courses when tab changes to browse
  useEffect(() => {
    if (user?.id) {
      if (state.activeTab === 'browse') {
        fetchCourses();
      }
    }
  }, [user?.id, state.activeTab, fetchCourses]);

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/courses/categories`);
      const categories = response.data.data || response.data || [];
      setState(prev => ({ ...prev, categories }));
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  // Handle search, filter, and tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.activeTab === 'my-courses') {
        fetchDashboardData();
      } else if (state.activeTab === 'browse') {
      } else if (state.activeTab === 'browse') {
        fetchCourses(state.pagination.currentPage);
      } else if (state.activeTab === 'faculty') {
        fetchFaculty();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state.searchTerm, state.filters, state.activeTab, state.pagination.currentPage, fetchCourses]);

  // Handle course enrollment
  const handleEnroll = async (courseId) => {
    if (!user?.id) {
      toast.error('Please login to enroll in courses');
      navigate('/login');
      return;
    }

    try {
      // Set loading state for this specific course
      setState(prev => ({
        ...prev,
        enrollmentLoading: { ...prev.enrollmentLoading, [courseId]: true }
      }));

      console.log("Enrolling student:", user.id, "course:", courseId);

      const res = await axios.post(
        `${API}/courses/${courseId}/enroll`,
        {
          student_id: user.id,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true
        }
      );

      toast.success(res.data.message || "Successfully enrolled in course!");

      // Update local state immediately
      const enrolledCourse = state.allCourses.find(c => c.id === courseId);
      if (enrolledCourse) {
        setState(prev => ({
          ...prev,
          myCourses: [...prev.myCourses, { ...enrolledCourse, enrollment: { progress: 0, last_accessed: new Date().toISOString() } }],
          filteredCourses: prev.filteredCourses.filter(c => c.id !== courseId),
          stats: prev.stats ? {
            ...prev.stats,
            enrolled_courses: (prev.stats.enrolled_courses || 0) + 1,
            active_courses: (prev.stats.active_courses || 0) + 1,
            total_courses: (prev.stats.total_courses || 0) + 1
          } : null,
          enrollmentLoading: { ...prev.enrollmentLoading, [courseId]: false }
        }));
      }

      // Create notification for enrollment
      await axios.post(`${API}/notifications`, {
        user_id: user.id,
        title: 'Course Enrollment',
        message: `You have successfully enrolled in "${enrolledCourse?.title}"`,
        type: 'enrollment',
        course_id: courseId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Refresh notifications
      fetchNotifications();

    } catch (err) {
      console.error("Enroll error:", err.response?.data || err.message);

      const errorData = err.response?.data?.error;
      const errorCode = errorData?.code;
      const errorMessage = errorData?.message || err.response?.data?.message || "Failed to enroll in course. Please try again.";

      // Handle "Already Enrolled" as a success state for the UI
      if (errorCode === 'ALREADY_ENROLLED' || errorMessage.toLowerCase().includes('already enrolled')) {
        toast.info("You are already enrolled in this course");

        const enrolledCourse = state.allCourses.find(c => c.id === courseId);
        if (enrolledCourse) {
          setState(prev => {
            // Avoid duplicates
            if (prev.myCourses.some(c => c.id === courseId)) {
              return {
                ...prev,
                enrollmentLoading: { ...prev.enrollmentLoading, [courseId]: false }
              };
            }

            return {
              ...prev,
              myCourses: [...prev.myCourses, { ...enrolledCourse, enrollment: { progress: 0 } }],
              filteredCourses: prev.filteredCourses.filter(c => c.id !== courseId),
              stats: prev.stats ? {
                ...prev.stats,
                enrolled_courses: (prev.stats.enrolled_courses || 0) + 1
              } : null,
              enrollmentLoading: { ...prev.enrollmentLoading, [courseId]: false }
            };
          });
        } else {
          setState(prev => ({
            ...prev,
            enrollmentLoading: { ...prev.enrollmentLoading, [courseId]: false }
          }));
        }
      } else {
        toast.error(errorMessage);

        setState(prev => ({
          ...prev,
          enrollmentLoading: { ...prev.enrollmentLoading, [courseId]: false }
        }));
      }
    }
  };

  // Handle unenrollment from a course
  const handleUnenroll = async (courseId, e) => {
    e.stopPropagation(); // Prevent navigation

    if (!user?.id) return;

    if (!window.confirm('Are you sure you want to unenroll from this course? Your progress will be lost.')) {
      return;
    }

    try {
      await axios.delete(`${API}/courses/${courseId}/enroll/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success('Successfully unenrolled from course');

      // Update local state
      const unenrolledCourse = state.myCourses.find(c => c.id === courseId);
      setState(prev => ({
        ...prev,
        myCourses: prev.myCourses.filter(c => c.id !== courseId),
        filteredCourses: unenrolledCourse ? [...prev.filteredCourses, unenrolledCourse] : prev.filteredCourses,
        stats: prev.stats ? {
          ...prev.stats,
          enrolled_courses: Math.max(0, (prev.stats.enrolled_courses || 0) - 1),
          active_courses: Math.max(0, (prev.stats.active_courses || 0) - 1),
          total_courses: Math.max(0, (prev.stats.total_courses || 0) - 1)
        } : null
      }));

    } catch (error) {
      console.error('Unenroll error:', error);
      toast.error('Failed to unenroll from course');
    }
  };

  // Handle mark notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    if (e) e.stopPropagation();

    if (!user?.id) return;

    try {
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Remove notification from state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId)
      }));

    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  // Handle mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id || !state.notifications.length) return;

    try {
      await axios.put(`${API}/students/${user.id}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setState(prev => ({ ...prev, notifications: [] }));
      toast.success('All notifications marked as read');

    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  // Handle page change for pagination
  const handlePageChange = (selectedItem) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, currentPage: selectedItem.selected + 1 }
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
      pagination: { ...prev.pagination, currentPage: 1 }
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setState(prev => ({
      ...prev,
      searchTerm: '',
      filters: {
        category: '',
        difficulty: '',
        sort: 'newest',
        price: 'all',
        rating: ''
      },
      pagination: { ...prev.pagination, currentPage: 1 }
    }));
  };

  // Fetch wishlist
  const fetchWishlist = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API}/students/${user.id}/wishlist`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setState(prev => ({ ...prev, wishlist: response.data.data || [] }));
    } catch (error) {
      console.error('Fetch wishlist error:', error);
    }
  };

  // Toggle wishlist
  const handleToggleWishlist = async (courseId, e) => {
    if (e) e.stopPropagation();
    try {
      const isInWishlist = state.wishlist.some(c => c.id === courseId);

      // Optimistic update
      if (isInWishlist) {
        setState(prev => ({ ...prev, wishlist: prev.wishlist.filter(c => c.id !== courseId) }));
        toast.success('Removed from wishlist');
      } else {
        // Try to find the course object to add it optimistically
        const course = state.allCourses?.find(c => c.id === courseId) ||
          state.recommendedCourses?.find(c => c.id === courseId) ||
          state.filteredCourses?.find(c => c.id === courseId);

        if (course) {
          setState(prev => ({ ...prev, wishlist: [...prev.wishlist, course] }));
          toast.success('Added to wishlist');
        }
      }

      await axios.post(`${API}/students/${user.id}/wishlist/toggle`, { courseId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Fetch to sync
      fetchWishlist();
    } catch (error) {
      console.error('Toggle wishlist error:', error);
      toast.error('Failed to update wishlist');
      fetchWishlist();
    }
  };

  // Share course
  const handleShareCourse = async (courseId, title, e) => {
    if (e) e.stopPropagation();

    const shareUrl = `${window.location.origin}/course/${courseId}`;
    const shareData = {
      title: title || 'Check out this course',
      text: `Check out this course: ${title}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Course link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback to clipboard if share fail or cancelled (though cancelled usually doesn't need error)
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Course link copied to clipboard!');
        } catch (clipboardErr) {
          toast.error('Failed to copy link');
        }
      }
    }
  };

  // Calculate course progress
  const calculateProgress = (course) => {
    if (!course.enrollment) return 0;
    return Math.round(course.enrollment.progress || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time remaining
  const formatTimeRemaining = (dueDate) => {
    if (!dueDate) return 'No due date';
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;

    if (diff < 0) return 'Overdue';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Due today';
  };

  // Format time (e.g., "2 hours 30 minutes")
  const formatTime = (minutes) => {
    if (!minutes) return '0 hours';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
        ))}
      </div>
    </div>
  );

  // Render dashboard tab
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-sky-100">
              {state.stats?.active_courses
                ? `You're enrolled in ${state.stats.active_courses} active courses`
                : 'Continue your learning journey'}
            </p>
            <div className="flex items-center mt-4 space-x-4">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                <span>Current Streak: {state.stats?.learning_streak || 0} days</span>
              </div>
              <div className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                <span>{state.stats?.daily_goal || 0}% of daily goal</span>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'browse' }))}
              className="px-6 py-3 bg-white text-sky-600 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
            >
              Browse New Courses
            </button>
            <button
              onClick={() => {
                setState(prev => ({ ...prev, isLoading: true }));
                fetchDashboardData();
                toast.success('Dashboard refreshed');
              }}
              className="p-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition backdrop-blur-sm"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-6 h-6 ${state.isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Courses</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.active_courses || 0}</p>
              <div className="mt-2 flex items-center">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-xs text-gray-500">
                  {state.stats?.active_courses_trend || 0} this week
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Progress</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.average_progress || 0}%</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(state.stats?.average_progress || 0)}`}
                  style={{ width: `${state.stats?.average_progress || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assignments Due</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.assignments_due || 0}</p>
              <div className="mt-2 flex items-center">
                {state.stats?.assignments_due > 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                )}
                <span className="text-xs text-gray-500">
                  {state.stats?.assignments_due > 0 ? 'Needs attention' : 'All caught up'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Certificates</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.certificates || 0}</p>
              <div className="mt-2 flex items-center">
                <Award className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="text-xs text-gray-500">
                  {state.stats?.certificates_trend || 0} this month
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Courses */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'my-courses' }))}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {state.myCourses.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border hover:shadow-md transition-shadow">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-6">Enroll in courses to start learning</p>
              <button
                onClick={() => setState(prev => ({ ...prev, activeTab: 'browse' }))}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 shadow-md hover:shadow-lg transition-all"
              >
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {state.myCourses.slice(0, 4).map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl p-5 border hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-800 group-hover:text-sky-600">{course.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(course.difficulty)}`}>
                            {course.difficulty || 'Beginner'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {calculateProgress(course)}% complete
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 mb-3">
                        <span className="text-sm text-gray-600 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          By {course.instructor_name || 'Unknown Instructor'}
                        </span>
                        {course.category && (
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            {course.category}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(course.duration_minutes)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            {course.rating || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {course.enrolled_students || 0}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/course/${course.id}`);
                          }}
                          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{calculateProgress(course)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(calculateProgress(course))}`}
                        style={{ width: `${calculateProgress(course)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Upcoming Assignments */}
          <div className="bg-white rounded-xl p-6 border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Upcoming Assignments</h3>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {state.upcomingAssignments.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No upcoming assignments</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.upcomingAssignments.slice(0, 3).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => navigate(`/course/${assignment.course_id}/assignment/${assignment.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-gray-800 mb-1 line-clamp-1">{assignment.title}</h4>
                        <p className="text-xs text-gray-600">{assignment.course_title}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${assignment.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {formatTimeRemaining(assignment.due_date)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Due: {formatDate(assignment.due_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {state.upcomingAssignments.length > 0 && (
              <button
                onClick={() => {
                  setState(prev => ({ ...prev, activeTab: 'assignments' }));
                  fetchUpcomingAssignments();
                }}
                className="w-full mt-4 text-center text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                View All Assignments
              </button>
            )}
          </div>

          {/* Recommended Courses */}
          <div className="bg-white rounded-xl p-6 border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recommended For You</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>

            {state.recommendedCourses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recommendations yet</p>
                <p className="text-xs text-gray-400 mt-1">Complete courses to get personalized recommendations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.recommendedCourses.slice(0, 3).map((course) => {
                  const isEnrolled = state.myCourses.some(c => c.id === course.id);

                  return (
                    <div
                      key={course.id}
                      className="p-3 bg-gradient-to-r from-sky-50/50 to-blue-50/50 rounded-lg border border-sky-100"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm text-gray-800 mb-1 line-clamp-1">{course.title}</h4>
                          <p className="text-xs text-gray-600">{course.instructor_name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(course.difficulty)}`}>
                          {course.difficulty || 'Beginner'}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-500">
                          <Star className="w-3 h-3 mr-1 text-yellow-500 fill-current" />
                          {course.rating || 'N/A'}
                          <span className="mx-1">•</span>
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(course.duration_minutes)}
                        </div>
                        <button
                          onClick={() => {
                            if (isEnrolled) {
                              navigate(`/course/${course.id}`);
                            } else {
                              handleEnroll(course.id);
                            }
                          }}
                          className="text-xs px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors"
                        >
                          {isEnrolled ? 'View' : 'Enroll'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Activity</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>

            {state.recentActivity.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recent activity</p>
                <p className="text-xs text-gray-400 mt-1">Start learning to see activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${activity.type === 'enrollment' ? 'bg-green-100 text-green-600' :
                      activity.type === 'completion' ? 'bg-blue-100 text-blue-600' :
                        activity.type === 'submission' ? 'bg-purple-100 text-purple-600' :
                          activity.type === 'progress' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                      }`}>
                      {activity.type === 'enrollment' && <BookOpen className="w-4 h-4" />}
                      {activity.type === 'completion' && <CheckCircle className="w-4 h-4" />}
                      {activity.type === 'submission' && <FileText className="w-4 h-4" />}
                      {activity.type === 'progress' && <TrendingUp className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );

  // Render browse courses tab
  const renderBrowseCourses = () => (
    <div>
      <button
        onClick={() => setState(prev => ({ ...prev, activeTab: 'dashboard' }))}
        className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              data-testid="search-courses-input"
              type="text"
              placeholder="Search courses by title, description, or instructor..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none hover:border-gray-400 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: prev.viewMode === 'grid' ? 'list' : 'grid' }))}
              className={`p-2 rounded-lg border transition-colors ${state.viewMode === 'grid'
                ? 'bg-sky-50 border-sky-200 text-sky-600'
                : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}
              title={state.viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              {state.viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setState(prev => ({ ...prev, showFilters: !prev.showFilters }));
                }}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all ${state.showFilters
                  ? 'bg-sky-50 border-sky-300 text-sky-600 ring-2 ring-sky-100'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
                {(state.filters.category || state.filters.difficulty || state.filters.price !== 'all' || state.filters.rating) && (
                  <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                )}
              </button>

              {/* Filter dropdown */}
              {state.showFilters && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Filters</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-sky-600 hover:text-sky-700"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, showFilters: false }))}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Category filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={state.filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                      >
                        <option value="">All Categories</option>
                        {state.categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Difficulty filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                      <select
                        value={state.filters.difficulty}
                        onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                      >
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    {/* Price filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <select
                        value={state.filters.price}
                        onChange={(e) => handleFilterChange('price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                      >
                        <option value="all">All Prices</option>
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>

                    {/* Sort filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={state.filters.sort}
                        onChange={(e) => handleFilterChange('sort', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                      >
                        {state.sortOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rating filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                      <div className="flex items-center space-x-2">
                        {[4, 3, 2, 1].map(rating => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleFilterChange('rating', state.filters.rating === rating ? '' : rating)}
                            className={`flex items-center px-3 py-1 rounded-lg border ${state.filters.rating === rating
                              ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                              : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                          >
                            <Star className={`w-4 h-4 mr-1 ${state.filters.rating === rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                            <span>{rating}+</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <button
                      onClick={() => fetchCourses(1)}
                      className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition-colors shadow-sm hover:shadow"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active filters */}
        {(state.filters.category || state.filters.difficulty || state.filters.price !== 'all' || state.filters.rating || state.searchTerm) && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-600">Active filters:</span>

            {state.filters.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                Category: {state.filters.category}
                <button
                  onClick={() => handleFilterChange('category', '')}
                  className="ml-2 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}

            {state.filters.difficulty && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                Difficulty: {state.filters.difficulty}
                <button
                  onClick={() => handleFilterChange('difficulty', '')}
                  className="ml-2 hover:text-green-900"
                >
                  ×
                </button>
              </span>
            )}

            {state.filters.price !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
                Price: {state.filters.price === 'free' ? 'Free' : 'Paid'}
                <button
                  onClick={() => handleFilterChange('price', 'all')}
                  className="ml-2 hover:text-purple-900"
                >
                  ×
                </button>
              </span>
            )}

            {state.filters.rating && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
                Rating: {state.filters.rating}+
                <button
                  onClick={() => handleFilterChange('rating', '')}
                  className="ml-2 hover:text-yellow-900"
                >
                  ×
                </button>
              </span>
            )}

            {state.searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                Search: {state.searchTerm}
                <button
                  onClick={() => setState(prev => ({ ...prev, searchTerm: '' }))}
                  className="ml-2 hover:text-gray-900"
                >
                  ×
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Courses Grid/List */}
      {state.loadingCourses ? (
        renderLoadingSkeleton()
      ) : (
        <>
          {/* Results count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {state.filteredCourses.length} of {state.pagination.totalItems} courses
            </p>
          </div>

          {/* Courses display */}
          {state.viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" data-testid="courses-grid">
              {state.filteredCourses.map((course) => {
                const isEnrolled = state.myCourses.some(c => c.id === course.id);
                const isLoading = state.enrollmentLoading[course.id];

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl overflow-hidden border hover:shadow-lg transition-shadow group"
                    data-testid={`course-card-${course.id}`}
                  >
                    {/* Course image */}
                    <div className="relative h-48 bg-gradient-to-br from-sky-400 to-blue-500 overflow-hidden">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <svg class="w-16 h-16 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-white opacity-80" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(course.difficulty)}`}>
                          {course.difficulty || 'Beginner'}
                        </span>
                        {course.is_featured && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                            Featured
                          </span>
                        )}
                      </div>

                      {/* Bookmark button */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <button
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                          onClick={(e) => handleToggleWishlist(course.id, e)}
                          title={state.wishlist.some(w => w.id === course.id) ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Bookmark className={`w-5 h-5 tsext-white ${state.wishlist.some(w => w.id === course.id) ? 'fill-white' : ''}`} />
                        </button>
                        <button
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                          onClick={(e) => handleShareCourse(course.id, course.title, e)}
                          title="Share course"
                        >
                          <MoreVertical className="w-5 h-5 text-white" />
                        </button>
                      </div>

                      {/* Category badge */}
                      <div className="absolute bottom-3 left-3">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-sm font-medium rounded-lg shadow-sm">
                          {course.category || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* Course info */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 h-14">
                          {course.title}
                        </h3>
                      </div>

                      <p className="text-sm text-gray-600 mb-1">By {course.instructor_name || 'Unknown Instructor'}</p>

                      <div className="flex items-center space-x-4 mb-4">
                        <span className="text-sm text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatTime(course.duration_minutes)}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {course.enrolled_students?.toLocaleString() || 0}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center">
                          <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                          {course.rating || 'N/A'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{course.description}</p>

                      {/* Price and enrollment */}
                      <div className="flex items-center justify-between">
                        <div>
                          {course.price === 0 || course.price === null ? (
                            <span className="text-lg font-bold text-green-600">Free</span>
                          ) : (
                            <>
                              <span className="text-lg font-bold text-gray-900">
                                ₹{course.price?.toLocaleString() || 0}
                              </span>
                              {course.original_price && course.original_price > course.price && (
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  ₹{course.original_price.toLocaleString()}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {isEnrolled ? (
                          <button
                            data-testid={`view-course-btn-${course.id}`}
                            onClick={() => navigate(`/course/${course.id}`)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            View Course
                          </button>
                        ) : (
                          <button
                            data-testid={`enroll-btn-${course.id}`}
                            onClick={() => handleEnroll(course.id)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${isLoading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:shadow-lg'
                              }`}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enrolling...
                              </>
                            ) : (
                              'Enroll Now'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-4 mb-8">
              {state.filteredCourses.map((course) => {
                const isEnrolled = state.myCourses.some(c => c.id === course.id);
                const isLoading = state.enrollmentLoading[course.id];

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl p-5 border hover:shadow-md transition-shadow group"
                    data-testid={`course-card-${course.id}`}
                  >
                    <div className="flex items-start space-x-5">
                      {/* Course image */}
                      <div className="w-32 h-32 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center">
                                    <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <BookOpen className="w-10 h-10 text-white" />
                        )}
                      </div>

                      {/* Course info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 group-hover:text-sky-600">
                              {course.title}
                            </h3>
                            <p className="text-sm text-gray-600">By {course.instructor_name || 'Unknown Instructor'}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-sm rounded-full ${getDifficultyColor(course.difficulty)}`}>
                              {course.difficulty || 'Beginner'}
                            </span>
                            {course.price === 0 || course.price === null ? (
                              <span className="text-lg font-bold text-green-600">Free</span>
                            ) : (
                              <div>
                                <span className="text-lg font-bold text-gray-900">
                                  ₹{course.price?.toLocaleString() || 0}
                                </span>
                                {course.original_price && course.original_price > course.price && (
                                  <span className="text-sm text-gray-500 line-through ml-2">
                                    ₹{course.original_price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mb-3">
                          <span className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatTime(course.duration_minutes)}
                          </span>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {course.enrolled_students?.toLocaleString() || 0} students
                          </span>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                            {course.rating || 'N/A'} rating
                          </span>
                          {course.category && (
                            <span className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                              {course.category}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              className={`p-2 transition-colors ${state.wishlist.some(w => w.id === course.id) ? 'text-sky-600' : 'text-gray-400 hover:text-sky-600'}`}
                              onClick={(e) => handleToggleWishlist(course.id, e)}
                              title={state.wishlist.some(w => w.id === course.id) ? "Remove from wishlist" : "Add to wishlist"}
                            >
                              <Bookmark className={`w-5 h-5 ${state.wishlist.some(w => w.id === course.id) ? 'fill-sky-600 text-sky-600' : ''}`} />
                            </button>
                            <button
                              className="p-2 text-gray-400 hover:text-sky-600 transition-colors"
                              onClick={(e) => handleShareCourse(course.id, course.title, e)}
                              title="Share course"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>

                          {isEnrolled ? (
                            <button
                              onClick={() => navigate(`/course/${course.id}`)}
                              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                            >
                              Continue Learning
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnroll(course.id)}
                              disabled={isLoading}
                              className={`px-6 py-2 rounded-lg font-medium transition-all ${isLoading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:shadow-lg'
                                }`}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                                  Enrolling...
                                </>
                              ) : (
                                'Enroll Now'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {state.pagination.totalPages > 1 && (
            <div className="mt-8">
              <ReactPaginate
                previousLabel={
                  <div className="flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Previous
                  </div>
                }
                nextLabel={
                  <div className="flex items-center">
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                }
                breakLabel="..."
                pageCount={state.pagination.totalPages}
                marginPagesDisplayed={2}
                pageRangeDisplayed={5}
                onPageChange={handlePageChange}
                containerClassName="flex items-center justify-center space-x-2"
                pageClassName="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                pageLinkClassName="text-gray-700"
                previousClassName="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                previousLinkClassName="text-gray-700 flex items-center"
                nextClassName="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                nextLinkClassName="text-gray-700 flex items-center"
                breakClassName="px-3 py-2 text-gray-500"
                activeClassName="bg-sky-500 text-white border-sky-500 shadow-sm"
                activeLinkClassName="text-white"
                disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
                forcePage={state.pagination.currentPage - 1}
              />
            </div>
          )}
        </>
      )}

      {state.filteredCourses.length === 0 && !state.loadingCourses && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No courses found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 shadow-md hover:shadow-lg transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );

  // Render wishlist tab
  const renderWishlist = () => (
    <div>
      <button
        onClick={() => setState(prev => ({ ...prev, activeTab: 'dashboard' }))}
        className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Saved Courses</h2>
        <p className="text-gray-600">
          {state.wishlist.length} saved course{state.wishlist.length !== 1 ? 's' : ''}
        </p>
      </div>

      {state.wishlist.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border">
          <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-600 mb-6">Save courses to watch them later</p>
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'browse' }))}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 shadow-md transition-all"
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.wishlist.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl overflow-hidden border hover:shadow-lg transition-shadow group cursor-pointer"
              onClick={() => navigate(`/course/${course.id}`)}
            >
              {/* Course image */}
              <div className="relative h-48 bg-gradient-to-br from-sky-400 to-blue-500 overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-80" />
                  </div>
                )}
                {/* Bookmark button */}
                <button
                  className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                  onClick={(e) => handleToggleWishlist(course.id, e)}
                >
                  <Bookmark className="w-5 h-5 text-white fill-white" />
                </button>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(course.difficulty)}`}>
                    {course.difficulty || 'Beginner'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-sky-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">By {course.instructor_name}</p>

                <div className="flex items-center justify-between mt-4">
                  {course.price === 0 || course.price === null ? (
                    <span className="text-lg font-bold text-green-600">Free</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">₹{course.price?.toLocaleString()}</span>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                    <span>{course.rating || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render my courses tab
  const renderMyCourses = () => (
    <div>
      <button
        onClick={() => setState(prev => ({ ...prev, activeTab: 'dashboard' }))}
        className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">My Courses</h2>
            <p className="text-gray-600">
              {state.myCourses.length} enrolled course{state.myCourses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'browse' }))}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 shadow-sm hover:shadow transition-all"
          >
            Browse More Courses
          </button>
        </div>
      </div>

      {state.myCourses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border hover:shadow-md transition-shadow">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No enrolled courses</h3>
          <p className="text-gray-600 mb-6">Browse courses and enroll to start learning</p>
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'browse' }))}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 shadow-md hover:shadow-lg transition-all"
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <>
          {/* Progress summary */}
          <div className="mb-8 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-6 border border-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Overall Learning Progress</h3>
                <p className="text-sm text-gray-600">
                  {state.myCourses.filter(c => calculateProgress(c) === 100).length} courses completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-sky-600">{state.stats?.average_progress || 0}%</p>
                <p className="text-sm text-gray-600">Average progress</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(state.stats?.average_progress || 0)}`}
                  style={{ width: `${state.stats?.average_progress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Courses grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="my-courses-grid">
            {state.myCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl overflow-hidden border hover:shadow-lg transition-shadow group"
                onClick={() => navigate(`/course/${course.id}`)}
                data-testid={`my-course-card-${course.id}`}
              >
                <div className="relative h-40 bg-gradient-to-br from-sky-400 to-blue-500">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center">
                              <svg class="w-12 h-12 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-white opacity-80" />
                    </div>
                  )}

                  {/* Progress overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Progress</span>
                      <span className="text-sm font-medium">{calculateProgress(course)}%</span>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(calculateProgress(course))}`}
                        style={{ width: `${calculateProgress(course)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Unenroll button */}
                  <button
                    onClick={(e) => handleUnenroll(course.id, e)}
                    className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors group/unenroll"
                    title="Unenroll from course"
                  >
                    <X className="w-4 h-4 text-white" />
                    <span className="absolute top-full right-0 mt-1 w-24 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover/unenroll:opacity-100 transition-opacity pointer-events-none">
                      Unenroll
                    </span>
                  </button>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-sky-600">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">By {course.instructor_name || 'Unknown Instructor'}</p>

                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs px-3 py-1 rounded-full ${getDifficultyColor(course.difficulty)}`}>
                      {course.difficulty || 'Beginner'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Last accessed: {course.enrollment?.last_accessed ? formatDate(course.enrollment.last_accessed) : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/course/${course.id}`);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center group/continue"
                  >
                    <Play className="w-4 h-4 mr-2 group-hover/continue:animate-pulse" />
                    {calculateProgress(course) > 0 ? 'Continue Learning' : 'Start Learning'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load more button if pagination needed */}
          {state.myCourses.length >= 6 && (
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  // In a real app, this would load more courses
                  toast.info('Loading more courses...');
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Load More Courses
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const isUserMenu = target.closest('[data-user-menu]');
      const isNotifications = target.closest('[data-notifications]');
      const isFilters = target.closest('[data-filters]');

      if (state.showUserMenu && !isUserMenu) {
        setState(prev => ({ ...prev, showUserMenu: false }));
      }
      if (state.notificationsOpen && !isNotifications) {
        setState(prev => ({ ...prev, notificationsOpen: false }));
      }
      if (state.showFilters && !isFilters) {
        setState(prev => ({ ...prev, showFilters: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [state.showUserMenu, state.notificationsOpen, state.showFilters]);

  // Main render
  if (state.isLoading && state.activeTab === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching your learning data</p>
        </div>
      </div>
    );
  }

  // Fetch faculty
  const fetchFaculty = async () => {
    try {
      setState(prev => ({ ...prev, loadingFaculty: true }));
      const response = await axios.get(`${API}/students/instructors/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
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
                    {/* <div className="flex items-center text-sm text-gray-500">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{instructor.students || 0} Students</span>
                    </div> */}
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

  // Render assignments tab
  const renderAssignments = () => (
    <div className="bg-white rounded-2xl p-8 shadow-sm border">
      {state.assignmentsView === 'overview' && (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-sky-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Assignments</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            View and submit your assignments. Track deadlines and check your grades.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-xl border hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800 mb-2">Upcoming Assignments</h3>
              <p className="text-gray-600 text-sm mb-4">
                {state.upcomingAssignments.length} assignment{state.upcomingAssignments.length !== 1 ? 's' : ''} due soon
              </p>
              <button
                onClick={() => setState(prev => ({ ...prev, assignmentsView: 'upcoming' }))}
                className="text-sky-600 hover:text-sky-700 text-sm font-medium"
              >
                View all →
              </button>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800 mb-2">Completed</h3>
              <p className="text-gray-600 text-sm mb-4">
                Check your submitted assignments and grades
              </p>
              <button
                onClick={() => {
                  setState(prev => ({ ...prev, assignmentsView: 'completed' }));
                  fetchCompletedAssignments();
                }}
                className="text-sky-600 hover:text-sky-700 text-sm font-medium"
              >
                View submissions →
              </button>
            </div>
          </div>
        </div>
      )}

      {state.assignmentsView === 'upcoming' && (
        <div>
          <button
            onClick={() => setState(prev => ({ ...prev, assignmentsView: 'overview' }))}
            className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assignments</span>
          </button>
          <h3 className="text-xl font-bold text-gray-800 mb-6">Upcoming Assignments</h3>

          {state.upcomingAssignments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
              <p className="text-gray-500">No upcoming assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-xl p-5 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">{assignment.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{assignment.course_title}</p>
                    <p className="text-sm text-red-500 mt-2 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/course/${assignment.course_id}`)}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium text-sm whitespace-nowrap"
                  >
                    Go to Course
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {state.assignmentsView === 'completed' && (
        <div>
          <button
            onClick={() => setState(prev => ({ ...prev, assignmentsView: 'overview' }))}
            className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assignments</span>
          </button>
          <h3 className="text-xl font-bold text-gray-800 mb-6">Completed Assignments</h3>

          {state.completedAssignments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
              <p className="text-gray-500">No completed assignments found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Assignment</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Course</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Submitted Date</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Grade</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {state.completedAssignments.map((sub, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{sub.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sub.course_title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(sub.submitted_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sub.grade ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                            {sub.grade}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{typeof sub.score === 'number' ? `${Math.round(sub.score)}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800">EduPlatform</span>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1 ml-8">
                {['dashboard', 'browse', 'my-courses', 'assignments', 'wishlist', 'certificates', 'faculty'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setState(prev => ({ ...prev, activeTab: tab }));
                      if (tab === 'assignments') {
                        fetchUpcomingAssignments();
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${state.activeTab === tab
                      ? 'bg-sky-50 text-sky-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </nav>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" data-notifications>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState(prev => ({
                      ...prev,
                      notificationsOpen: !prev.notificationsOpen,
                      showUserMenu: false,
                      showFilters: false
                    }));
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {state.notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {state.notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {state.notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b bg-gradient-to-r from-sky-50 to-blue-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        <div className="flex items-center space-x-2">
                          {state.notifications.length > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                            >
                              Mark all as read
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setState(prev => ({ ...prev, notificationsOpen: false }));
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {state.notifications.length} unread notification{state.notifications.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {state.notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No new notifications</p>
                          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        state.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-4 border-b hover:bg-gray-50 last:border-0 transition-colors cursor-pointer group/notif"
                            onClick={() => {
                              if (notification.course_id) {
                                navigate(`/course/${notification.course_id}`);
                              }
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-start space-x-3">
                                  <div className={`p-2 rounded-full ${notification.type === 'enrollment' ? 'bg-green-100 text-green-600' :
                                    notification.type === 'assignment' ? 'bg-yellow-100 text-yellow-600' :
                                      notification.type === 'announcement' ? 'bg-blue-100 text-blue-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {notification.type === 'enrollment' && <BookOpen className="w-4 h-4" />}
                                    {notification.type === 'assignment' && <FileText className="w-4 h-4" />}
                                    {notification.type === 'announcement' && <Bell className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {formatDate(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="opacity-0 group-hover/notif:opacity-100 text-gray-400 hover:text-gray-600 ml-2 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User profile */}
              <div className="flex items-center space-x-3" data-user-menu>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'student'}</p>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setState(prev => ({
                        ...prev,
                        showUserMenu: !prev.showUserMenu,
                        notificationsOpen: false,
                        showFilters: false
                      }));
                    }}
                    className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
                  </button>

                  {/* User dropdown */}
                  {state.showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b bg-gradient-to-r from-sky-50 to-blue-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate mt-1">{user?.email}</p>
                      </div>

                      <div className="py-2">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 transition-colors"
                          onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                        >
                          <Eye className="w-4 h-4 mr-3" />
                          View Profile
                        </Link>
                        <Link
                          to="/profile?tab=settings"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 transition-colors"
                          onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                        >
                          <BarChart3 className="w-4 h-4 mr-3" />
                          Settings
                        </Link>
                        <Link
                          to="/help"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 transition-colors"
                          onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                        >
                          <AlertCircle className="w-4 h-4 mr-3" />
                          Help & Support
                        </Link>
                      </div>

                      <div className="border-t">
                        <button
                          data-testid="logout-btn"
                          onClick={() => {
                            setState(prev => ({ ...prev, showUserMenu: false }));
                            logout();
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
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
              {['dashboard', 'browse', 'my-courses', 'assignments', 'wishlist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
                  className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-all ${state.activeTab === tab
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
              <button
                onClick={() => setState(prev => ({ ...prev, activeTab: 'faculty' }))}
                className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-all ${state.activeTab === 'faculty'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Faculty
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.activeTab === 'dashboard' && renderDashboard()}
        {state.activeTab === 'browse' && renderBrowseCourses()}
        {state.activeTab === 'my-courses' && renderMyCourses()}
        {state.activeTab === 'assignments' && renderAssignments()}
        {state.activeTab === 'wishlist' && renderWishlist()}
        {state.activeTab === 'certificates' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border">
            <div className="text-center py-8">
              <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Certificates</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                View and download your course completion certificates. Share your achievements with others.
              </p>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {state.myCourses
                  .filter(course => course.enrollment?.progress === 100)
                  .slice(0, 3)
                  .map(course => (
                    <div key={course.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Award className="w-6 h-6 text-yellow-600" />
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{course.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Completed on {formatDate(course.certificate?.issued_at || course.enrollment?.completed_at || new Date())}
                      </p>
                      {course.certificate ? (
                        <div className="flex flex-col space-y-2">
                          <Link
                            to={`/certificate/${course.certificate.verification_code}`}
                            target="_blank"
                            className="block w-full text-center py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                          >
                            View Certificate
                          </Link>
                        </div>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 bg-gray-300 text-white rounded-lg font-medium cursor-not-allowed"
                        >
                          Certificate Pending
                        </button>
                      )}
                    </div>
                  ))}
              </div>
              {state.myCourses.filter(c => c.enrollment?.progress === 100).length === 0 && (
                <p className="text-gray-500 mt-6">Complete courses to earn certificates!</p>
              )}
            </div>
          </div>
        )}
        {state.activeTab === 'faculty' && renderFaculty()}
      </main>

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

export default StudentDashboard;