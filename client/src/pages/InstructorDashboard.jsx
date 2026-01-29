// client/src/pages/InstructorDashboard.jsx

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import {
  ArrowLeft,
  BookOpen,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Users,
  User,
  BarChart3,
  IndianRupee,
  Clock,
  TrendingUp,
  Bell,
  ChevronRight,
  MoreVertical,
  Download,
  Eye,
  MessageSquare,
  Award,
  Filter,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  Star,
  FileText,
  Video,
  Settings,
  UserPlus,
  FileUp,
  RefreshCw,
  ChevronDown,
  Check,
  Send,
  Lock,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactPaginate from 'react-paginate';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function InstructorDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [state, setState] = useState({
    courses: [],
    filteredCourses: [],
    isLoading: true,
    loadingCourses: false,
    showCreateModal: false,
    showDeleteModal: false,
    courseToDelete: null,
    courseToEdit: null,
    activeTab: location.pathname.includes('/settings')
      ? 'settings'
      : (localStorage.getItem('instructor_dashboard_tab') || 'overview'),
    searchTerm: '',
    filters: {
      status: 'all', // all, published, draft, archived
      sort: 'newest',
      category: ''
    },
    stats: null,
    analytics: null,
    recentEnrollments: [],
    recentSubmissions: [],
    enrolledStudents: [],
    notifications: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 8
    },
    formData: {
      title: '',
      description: '',
      thumbnail_url: '',
      category: 'General',
      price: 0,
      difficulty: 'beginner',
      tags: [],
      status: 'draft',
      completion_status: 'ongoing'
    },
    showUserMenu: false,
    activeDropdown: null,
    showChangePasswordModal: false,
    notificationsOpen: false,
    chat: {
      activeCourseId: null,
      messages: [],
      messageInput: ''
    },
    allSubmissions: [],
    selectedSubmission: null,
    showSubmissionModal: false,
    gradingLoading: false,
    gradingData: {
      grade: '',
      feedback: ''
    },
    earningsData: null
  });

  // Persist dashboard preferences
  useEffect(() => {
    if (state.activeTab) {
      localStorage.setItem('instructor_dashboard_tab', state.activeTab);
    }
  }, [state.activeTab]);



  // Fetch earnings when tab is active
  useEffect(() => {
    if (state.activeTab === 'earnings' && user?.id) {
      fetchEarnings();
    }
  }, [state.activeTab, user?.id]);

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(`${API}/instructors/${user.id}/earnings`);
      setState(prev => ({
        ...prev,
        earningsData: response.data.data
      }));
    } catch (error) {
      console.error('Earnings error:', error);
      toast.error('Failed to load earnings data');
    }
  };

  // Fetch messages for a course
  const fetchCourseMessages = useCallback(async (courseId) => {
    try {
      const response = await axios.get(`${API}/courses/${courseId}/messages`);
      setState(prev => ({
        ...prev,
        chat: {
          ...prev.chat,
          messages: response.data.data || []
        }
      }));
    } catch (error) {
      console.error('Fetch messages error:', error);
      toast.error('Failed to load messages');
    }
  }, []);

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!state.chat.messageInput.trim() || !state.chat.activeCourseId || !user?.id) return;

    try {
      await axios.post(`${API}/courses/${state.chat.activeCourseId}/messages`, {
        sender_id: user.id,
        sender_name: user.name || 'Instructor',
        sender_role: user.role || 'instructor',
        message: state.chat.messageInput
      });

      // Clear input and refresh messages
      setState(prev => ({
        ...prev,
        chat: {
          ...prev.chat,
          messageInput: ''
        }
      }));
      fetchCourseMessages(state.chat.activeCourseId);

    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    }
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Filter courses function
  const filterCourses = useCallback(() => {
    let filtered = [...state.courses];

    // Apply search
    if (state.searchTerm) {
      const searchTerm = state.searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title?.toLowerCase().includes(searchTerm) ||
        course.description?.toLowerCase().includes(searchTerm) ||
        course.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (state.filters.status !== 'all') {
      filtered = filtered.filter(course => course.status === state.filters.status);
    }

    // Apply category filter
    if (state.filters.category) {
      filtered = filtered.filter(course => course.category === state.filters.category);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (state.filters.sort) {
        case 'newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'enrollments':
          return (b.enrolled_students || 0) - (a.enrolled_students || 0);
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0); // Corrected property name from rating to average_rating if needed, or check data
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
        totalPages: totalPages || 1, // Ensure at least 1 page
        totalItems: filtered.length
      }
    }));
  }, [state.courses, state.searchTerm, state.filters, state.pagination.currentPage, state.pagination.itemsPerPage]);

  // Handle search and filter changes
  useEffect(() => {
    filterCourses();
  }, [filterCourses]);

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const [
        coursesRes,
        statsRes,
        analyticsRes,
        enrollmentsRes,
        submissionsRes,
        studentsRes
      ] = await Promise.all([
        axios.get(`${API}/instructors/${user.id}/courses`),
        axios.get(`${API}/instructors/${user.id}/stats`),
        axios.get(`${API}/instructors/${user.id}/analytics`),
        axios.get(`${API}/instructors/${user.id}/enrollments/recent`),
        axios.get(`${API}/instructors/${user.id}/submissions/recent`),
        axios.get(`${API}/instructors/${user.id}/students`)
      ]);

      const courses = coursesRes.data.data || coursesRes.data || [];
      const studentsList = studentsRes.data.data || studentsRes.data || [];
      const uniqueStudentsCount = new Set(studentsList.map(s => s.student_email).filter(Boolean)).size;

      setState(prev => ({
        ...prev,
        courses: courses,
        filteredCourses: courses,
        stats: {
          ...(statsRes.data.data || statsRes.data || {}),
          total_students: uniqueStudentsCount,
          active_students: uniqueStudentsCount
        },
        analytics: analyticsRes.data.data || analyticsRes.data || {},
        recentEnrollments: enrollmentsRes.data.data || enrollmentsRes.data || [],
        recentSubmissions: submissionsRes.data.data || submissionsRes.data || [],
        enrolledStudents: studentsList,
        isLoading: false,
        pagination: {
          ...prev.pagination,
          totalItems: courses.length
        }
      }));

    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Failed to load dashboard data');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setState(prev => ({
        ...prev,
        notifications: response.data.data || response.data || []
      }));
    } catch (error) {
      console.error('Notifications error:', error);
    }
  };

  // Handle page change
  const handlePageChange = (selectedItem) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
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
      }
    }));
  };

  // Handle create/update course
  const handleCreateCourse = async (e) => {
    e.preventDefault();

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      if (state.courseToEdit) {
        // Update existing course
        const response = await axios.put(`${API}/courses/${state.courseToEdit.id}`, state.formData);

        if (response.data.success) {
          toast.success('Course updated successfully!');
          setState(prev => ({
            ...prev,
            showCreateModal: false,
            courseToEdit: null,
            formData: {
              title: '',
              description: '',
              thumbnail_url: '',
              category: 'General',
              price: 0,
              difficulty: 'beginner',
              tags: [],
              status: 'draft',
              completion_status: 'ongoing'
            }
          }));
          await fetchDashboardData();
        }
      } else {
        // Create new course
        const response = await axios.post(`${API}/courses`, state.formData);

        if (response.data.success) {
          toast.success('Course created successfully!');
          setState(prev => ({
            ...prev,
            showCreateModal: false,
            formData: {
              title: '',
              description: '',
              thumbnail_url: '',
              category: 'General',
              price: 0,
              difficulty: 'beginner',
              tags: [],
              status: 'draft',
              completion_status: 'ongoing'
            }
          }));
          await fetchDashboardData();
        }
      }

    } catch (error) {
      toast.error(
        error.response?.data?.error?.details?.[0]?.message ||
        error.response?.data?.error?.message ||
        (state.courseToEdit ? 'Failed to update course' : 'Failed to create course')
      );
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleEditCourse = (course) => {
    setState(prev => ({
      ...prev,
      showCreateModal: true,
      courseToEdit: course,
      activeDropdown: null,
      formData: {
        title: course.title,
        description: course.description || '',
        thumbnail_url: course.thumbnail_url || '',
        category: course.category || 'General',
        price: course.price || 0,
        difficulty: course.difficulty || 'beginner',
        status: course.status || 'draft',
        completion_status: course.completion_status || 'ongoing',
        tags: course.tags || []
      }
    }));
  };

  // Handle delete course confirmation
  const confirmDeleteCourse = (course) => {
    if (!course?.id) return;

    setState(prev => ({
      ...prev,
      showDeleteModal: true,
      courseToDelete: course
    }));
  };

  // Handle delete course
  const handleDeleteCourse = async () => {
    if (!state.courseToDelete || !state.courseToDelete.id) return;

    const courseId = state.courseToDelete.id;
    console.log("Deleting course with ID:", courseId);

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Call API to delete from database
      await axios.delete(`${API}/courses/${courseId}`);

      toast.success('Course deleted successfully');

      // Update local state immediately (Optimistic UI)
      setState(prev => {
        const updatedCourses = prev.courses.filter(c => c.id !== courseId);
        const updatedFiltered = prev.filteredCourses.filter(c => c.id !== courseId);

        return {
          ...prev,
          courses: updatedCourses,
          filteredCourses: updatedFiltered,
          showDeleteModal: false,
          courseToDelete: null,
          isLoading: false,
          // Update pagination count manually
          pagination: {
            ...prev.pagination,
            totalItems: updatedCourses.length
          }
        };
      });

      // Refresh full data to ensure stats are synced
      await fetchDashboardData();

    } catch (error) {
      console.error("Delete course error:", error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete course');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };



  // Fetch all submissions
  const fetchSubmissions = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`${API}/instructors/${user.id}/submissions`);
      setState(prev => ({
        ...prev,
        allSubmissions: response.data.data || []
      }));
    } catch {
      toast.error('Failed to load submissions');
    }
  };

  // Handle view submission
  const handleViewSubmission = (submission) => {
    setState(prev => ({
      ...prev,
      selectedSubmission: submission,
      showSubmissionModal: true,
      gradingData: {
        grade: submission.grade ? submission.grade.toString().split('/')[0] : '',
        feedback: submission.feedback || ''
      }
    }));
  };

  // Handle grade submission
  const handleUpdateGrade = async (e) => {
    e.preventDefault();
    if (!state.selectedSubmission) return;

    try {
      setState(prev => ({ ...prev, gradingLoading: true }));

      await axios.put(`${API}/submissions/${state.selectedSubmission.id}/grade`, {
        grade: parseFloat(state.gradingData.grade),
        feedback: state.gradingData.feedback
      });

      toast.success('Submission graded successfully');

      setState(prev => ({
        ...prev,
        gradingLoading: false,
        showSubmissionModal: false,
        selectedSubmission: null
      }));

      fetchSubmissions();

    } catch (error) {
      console.error('Grading error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update grade');
      setState(prev => ({ ...prev, gradingLoading: false }));
    }
  };

  const renderEarnings = () => {
    const { earningsData } = state;
    if (!earningsData) return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(earningsData.total_earnings)}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <IndianRupee className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Monthly Income</p>
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(earningsData.monthly_income)}</h3>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Payout Status</p>
                <h3 className="text-2xl font-bold text-gray-900">{earningsData.payout_status}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction History */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900">Transaction History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {earningsData.transactions?.length > 0 ? (
                    earningsData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{formatDate(tx.date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{tx.course}</td>
                        <td className="px-6 py-4">{tx.student}</td>
                        <td className="px-6 py-4 text-green-600 font-medium">+{formatCurrency(tx.amount)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payout History */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900">Recent Payouts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Method</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {earningsData.payouts?.length > 0 ? (
                    earningsData.payouts.map((pay) => (
                      <tr key={pay.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{formatDate(pay.date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(pay.amount)}</td>
                        <td className="px-6 py-4 text-gray-500">{pay.method}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No payout history
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render messages tab
  const renderMessages = () => {
    const activeCourse = state.courses.find(c => c.id === state.chat.activeCourseId);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setState(prev => ({ ...prev, activeTab: 'overview' }))}
          className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-[600px] flex">
          {/* Course List Sidebar */}
          <div className="w-1/3 border-r bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800">Course Chats</h3>
            </div>
            <div className="overflow-y-auto flex-1">
              {state.courses.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">No courses available.</p>
              ) : (
                state.courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        chat: { ...prev.chat, activeCourseId: course.id }
                      }));
                      fetchCourseMessages(course.id);
                    }}
                    className={`w-full text-left p-4 hover:bg-white transition-colors border-b border-gray-100 ${state.chat.activeCourseId === course.id ? 'bg-white border-l-4 border-l-indigo-500 shadow-sm' : ''
                      }`}
                  >
                    <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {(course.enrolled_students || 0)} students enrolled
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {state.chat.activeCourseId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{activeCourse?.title || 'Untitled Course'}</h3>
                      <p className="text-xs text-green-600 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        Online
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {state.chat.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    state.chat.messages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[80%] ${msg.sender_id === user?.id ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                      >
                        <div className={`flex items-end space-x-2 ${msg.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.sender_id === user?.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                            {msg.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div
                            className={`p-3 rounded-2xl text-sm ${msg.sender_id === user?.id
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                              }`}
                          >
                            <p className="font-bold text-xs mb-1 opacity-90">{msg.sender_name || 'Unknown'} <span className="opacity-75 font-normal">({msg.sender_role || 'user'})</span></p>
                            <p>{msg.message || ''}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                          {msg.timestamp ? formatDate(msg.timestamp) : 'Just now'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={state.chat.messageInput}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        chat: { ...prev.chat, messageInput: e.target.value }
                      }))}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!state.chat.messageInput.trim()}
                      className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select a Course</h3>
                <p className="text-gray-500 max-w-sm">
                  Choose a course from the sidebar to view and send messages to your students.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render submissions tab
  const renderSubmissions = () => (
    <div className="space-y-6">
      <button
        onClick={() => setState(prev => ({ ...prev, activeTab: 'overview' }))}
        className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Overview</span>
      </button>
      <div className="bg-white rounded-xl p-6 border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">All Submissions</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Total: {state.allSubmissions?.length || 0}
            </span>
          </div>
        </div>

        {(!state.allSubmissions || state.allSubmissions.length === 0) ? (
          <div className="text-center py-12">
            <FileUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No submissions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Assignment</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Student</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Submitted Date</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Grade</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.allSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{submission.assignment_title || 'Untitled'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{submission.student_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(submission.submitted_at)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      {submission.grade || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${submission.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {submission.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewSubmission(submission)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View & Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );





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

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'Instructor'}!</h1>
            <p className="text-indigo-100">
              You have {state.stats?.total_courses || 0} courses with {state.stats?.total_students || 0} total students
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <button
              onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
              className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Create New Course
            </button>
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
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.total_courses || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {state.stats?.published_courses || 0} published
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.total_students || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {state.stats?.active_students || 0} active
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(state.stats?.total_revenue || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {state.stats?.monthly_revenue ? formatCurrency(state.stats.monthly_revenue) + ' this month' : ''}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <IndianRupee className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-3xl font-bold mt-2">{state.stats?.average_rating || '0.0'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {state.stats?.total_reviews || 0} reviews
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Courses */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Recent Courses</h2>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'courses' }))}
              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {state.courses.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-6">Create your first course to start teaching</p>
              <button
                onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Create Course
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {state.courses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl p-5 border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-800">{course.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${course.status === 'published' ? 'bg-green-100 text-green-700' :
                            course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                            {course.status || 'draft'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {course.enrolled_students || 0}
                          </span>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Star className="w-4 h-4 mr-1" />
                            {course.rating || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description || 'No description'}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {course.category || 'General'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {formatDate(course.created_at)}
                          </span>
                          {course.price > 0 && (
                            <span className="text-xs font-semibold text-gray-800">
                              {formatCurrency(course.price)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/course/${course.id}`)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                          >
                            Manage
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setState(prev => ({ ...prev, activeDropdown: prev.activeDropdown === course.id ? null : course.id }));
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {state.activeDropdown === course.id && (
                              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCourse(course);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-gray-500" />
                                  Edit Details
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setState(prev => ({ ...prev, activeDropdown: null })); // Close dropdown
                                    confirmDeleteCourse(course);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Course
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Recent Enrollments */}
          <div className="bg-white rounded-xl p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Enrollments</h3>
              <UserPlus className="w-5 h-5 text-gray-400" />
            </div>

            {state.recentEnrollments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent enrollments</p>
            ) : (
              <div className="space-y-4">
                {state.recentEnrollments.slice(0, 3).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {enrollment.student_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-800">{enrollment.student_name || 'Student'}</h4>
                      <p className="text-xs text-gray-600">{enrollment.course_title || 'Course'}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(enrollment.enrolled_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'students' }))}
              className="w-full mt-4 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All Students
            </button>
          </div>

          {/* Recent Submissions */}
          <div className="bg-white rounded-xl p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Submissions</h3>
              <FileUp className="w-5 h-5 text-gray-400" />
            </div>

            {state.recentSubmissions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent submissions</p>
            ) : (
              <div className="space-y-4">
                {state.recentSubmissions.slice(0, 3).map((submission) => (
                  <div key={submission.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-gray-800 mb-1">{submission.assignment_title || 'Assignment'}</h4>
                        <p className="text-xs text-gray-600">{submission.student_name || 'Student'}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${submission.status === 'graded'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {submission.status || 'pending'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDate(submission.submitted_at)}
                      </span>
                      {submission.grade && (
                        <span className="text-xs font-semibold text-gray-800">
                          Grade: {submission.grade}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setState(prev => ({ ...prev, activeTab: 'submissions' }));
                fetchSubmissions();
              }}
              className="w-full mt-4 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All Submissions
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 border">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setState(prev => ({ ...prev, activeTab: 'messages' }))}
                className="w-full flex items-center justify-between p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <span className="font-medium">Create Announcement</span>
                <MessageSquare className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  if (!state.analytics?.revenue_data || state.analytics.revenue_data.length === 0) {
                    toast.error("No analytics data to export");
                    return;
                  }
                  const headers = ["Month", "Revenue", "Students"];
                  const csvRows = [headers.join(",")];

                  state.analytics.revenue_data.forEach(row => {
                    csvRows.push([
                      `"${row.name}"`,
                      row.revenue || 0,
                      row.students || 0
                    ].join(","));
                  });

                  const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast.success("Analytics exported successfully");
                }}
                className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="font-medium">Export Analytics</span>
                <Download className="w-5 h-5" />
              </button>

              <button
                onClick={() => setState(prev => ({ ...prev, activeTab: 'courses' }))}
                className="w-full flex items-center justify-between p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <span className="font-medium">Course Settings</span>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render students tab
  const renderStudents = () => (
    <div className="space-y-6">
      <button
        onClick={() => setState(prev => ({ ...prev, activeTab: 'overview' }))}
        className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Overview</span>
      </button>
      <div className="bg-white rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Enrolled Students</h3>
          <button
            onClick={() => {
              if (state.enrolledStudents.length === 0) {
                toast.error("No students to export");
                return;
              }
              const headers = ["Student ID", "Student Name", "Email", "Course", "Enrolled Date"];
              const csvContent = [
                headers.join(","),
                ...state.enrolledStudents.map(student => [
                  `"${student.student_user_id || student.student_id || ''}"`,
                  `"${student.student_name || ''}"`,
                  `"${student.student_email || ''}"`,
                  `"${student.course_title || ''}"`,
                  `"${student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : ''}"`
                ].join(","))
              ].join("\n");

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              const url = URL.createObjectURL(blob);
              link.setAttribute("href", url);
              link.setAttribute("download", "enrolled_students.csv");
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success("Students exported successfully");
            }}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {state.enrolledStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No students found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Student Name</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Course</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">Enrolled Date</th>
                </tr>
              </thead>
              <tbody>
                {state.enrolledStudents.map((student, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                          {student.student_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <span className="font-medium text-gray-800">{student.student_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.student_email || 'No email'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.course_title || 'No course'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(student.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render analytics tab
  const renderAnalytics = () => {
    if (!state.analytics) return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available.</p>
      </div>
    );

    const { revenue_data } = state.analytics;
    const maxRevenue = Math.max(...(revenue_data?.map(d => d.revenue) || [0]), 1); // Avoid div by zero
    const maxStudents = Math.max(...(revenue_data?.map(d => d.students) || [0]), 1);

    return (
      <div className="space-y-8">
        <button
          onClick={() => setState(prev => ({ ...prev, activeTab: 'overview' }))}
          className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(state.stats?.total_revenue || 0)}</p>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+0% this month</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Active Students</h3>
            <p className="text-3xl font-bold text-gray-900">{state.stats?.active_students || 0}</p>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <Users className="w-4 h-4 mr-1" />
              <span>Active learners</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Course Rating</h3>
            <p className="text-3xl font-bold text-gray-900">{state.stats?.average_rating || '0.0'}</p>
            <div className="mt-2 flex items-center text-sm text-yellow-600">
              <Star className="w-4 h-4 mr-1 fill-yellow-600" />
              <span>Average rating</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Overview</h3>
            <div className="flex items-end justify-between h-64 space-x-2">
              {revenue_data?.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {formatCurrency(data.revenue)}
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full bg-indigo-100 rounded-t-sm hover:bg-indigo-200 transition-all relative group-hover:shadow-md"
                    style={{ height: `${(data.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm transition-all duration-500"
                      style={{ height: '100%' }}
                    ></div>
                  </div>

                  {/* X-axis Label */}
                  <div className="mt-3 text-xs text-gray-500 rotate-0 truncate w-full text-center">
                    {data.name?.split(' ')[0] || 'Month'} {/* Show distinct month name */}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrollment Chart */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Student Enrollments</h3>
            <div className="flex items-end justify-between h-64 space-x-2">
              {revenue_data?.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {data.students || 0} Students
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full bg-purple-100 rounded-t-sm hover:bg-purple-200 transition-all relative group-hover:shadow-md"
                    style={{ height: `${(data.students / maxStudents) * 100}%`, minHeight: '4px' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-purple-500 rounded-t-sm transition-all duration-500"
                      style={{ height: '100%' }}
                    ></div>
                  </div>

                  {/* X-axis Label */}
                  <div className="mt-3 text-xs text-gray-500 rotate-0 truncate w-full text-center">
                    {data.name?.split(' ')[0] || 'Month'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render courses tab
  const renderCourses = () => (
    <div>
      <button
        onClick={() => setState(prev => ({ ...prev, activeTab: 'overview' }))}
        className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Overview</span>
      </button>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search your courses..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState(prev => ({
                      ...prev,
                      activeDropdown: prev.activeDropdown === 'status' ? null : 'status'
                    }));
                  }}
                  className="flex items-center justify-between min-w-[180px] px-4 py-2
                             bg-white border border-gray-300 rounded-lg shadow-sm
                             text-gray-700 text-sm
                             hover:border-indigo-500 hover:text-indigo-600
                             focus:ring-2 focus:ring-indigo-500
                             transition-all"
                >
                  <span className="capitalize">
                    {state.filters.status === 'all' ? 'All Status' : state.filters.status}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ml-2 transition-transform ${state.activeDropdown === 'status' ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {state.activeDropdown === 'status' && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                    {['all', 'published', 'draft', 'archived'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          handleFilterChange('status', status);
                          setState(prev => ({ ...prev, activeDropdown: null }));
                        }}
                        className="w-full text-left px-4 py-2 text-sm
                                   text-gray-700 hover:bg-indigo-50 hover:text-indigo-600
                                   flex items-center justify-between"
                      >
                        <span className="capitalize">
                          {status === 'all' ? 'All Status' : status}
                        </span>
                        {state.filters.status === status && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState(prev => ({
                      ...prev,
                      activeDropdown: prev.activeDropdown === 'sort' ? null : 'sort'
                    }));
                  }}
                  className="flex items-center justify-between min-w-[180px] px-4 py-2
                             bg-white border border-gray-300 rounded-lg shadow-sm
                             text-gray-700 text-sm
                             hover:border-indigo-500 hover:text-indigo-600
                             focus:ring-2 focus:ring-indigo-500
                             transition-all"
                >
                  <span>
                    {state.filters.sort === 'newest' && 'Newest'}
                    {state.filters.sort === 'oldest' && 'Oldest'}
                    {state.filters.sort === 'enrollments' && 'Most Enrollments'}
                    {state.filters.sort === 'rating' && 'Highest Rated'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ml-2 transition-transform ${state.activeDropdown === 'sort' ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {state.activeDropdown === 'sort' && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                    {[
                      { value: 'newest', label: 'Newest' },
                      { value: 'oldest', label: 'Oldest' },
                      { value: 'enrollments', label: 'Most Enrollments' },
                      { value: 'rating', label: 'Highest Rated' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleFilterChange('sort', opt.value);
                          setState(prev => ({ ...prev, activeDropdown: null }));
                        }}
                        className="w-full text-left px-4 py-2 text-sm
                                   text-gray-700 hover:bg-indigo-50 hover:text-indigo-600
                                   flex items-center justify-between"
                      >
                        <span
                          className={`font-medium ${state.filters.sort === opt.value
                            ? 'text-indigo-600'
                            : ''
                            }`}
                        >
                          {opt.label}
                        </span>
                        {state.filters.sort === opt.value && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>New Course</span>
            </button>
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
                <div className="relative h-40 bg-gradient-to-br from-indigo-400 to-purple-500">
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
                      {course.status || 'draft'}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{course.enrolled_students || 0}</span>
                      </div>
                      {course.price > 0 && (
                        <span className="text-sm font-semibold">
                          {formatCurrency(course.price)}
                        </span>
                      )}
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

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description || 'No description'}</p>

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
                    <div className="text-xs text-gray-500">
                      {course.lectures || 0} lectures
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Manage
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setState(prev => ({ ...prev, activeDropdown: prev.activeDropdown === `grid-${course.id}` ? null : `grid-${course.id}` }));
                        }}
                        className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors h-full"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {state.activeDropdown === `grid-${course.id}` && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCourse(course);
                              setState(prev => ({ ...prev, activeDropdown: null }));
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-2 text-gray-500" />
                            Edit Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setState(prev => ({ ...prev, activeDropdown: null }));
                              confirmDeleteCourse(course);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Course
                          </button>
                        </div>
                      )}
                    </div>
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
              onPageChange={handlePageChange}
              containerClassName="flex items-center justify-center space-x-2"
              pageClassName="px-3 py-2 border rounded-lg hover:bg-gray-50"
              pageLinkClassName="text-gray-700"
              previousClassName="px-4 py-2 border rounded-lg hover:bg-gray-50"
              previousLinkClassName="text-gray-700"
              nextClassName="px-4 py-2 border rounded-lg hover:bg-gray-50"
              nextLinkClassName="text-gray-700"
              breakClassName="px-3 py-2"
              activeClassName="bg-indigo-500 text-white border-indigo-500"
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
          <p className="text-gray-600 mb-6">Create your first course or adjust your filters</p>
          <button
            onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Create Course
          </button>
        </div>
      )}
    </div>
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (state.activeDropdown || state.showUserMenu || state.notificationsOpen) {
        setState(prev => ({
          ...prev,
          activeDropdown: null,
          showUserMenu: false,
          notificationsOpen: false
        }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [state.activeDropdown, state.showUserMenu, state.notificationsOpen]);

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

  // Main render
  if (state.isLoading && state.activeTab === 'overview') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Combined Sticky Header & Navigation */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row: Brand, Actions & Profile */}
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900 leading-none">EduPlatform</span>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full w-fit mt-1">Instructor</span>
                </div>
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Course</span>
              </button>

              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState(prev => ({ ...prev, showUserMenu: false, notificationsOpen: !state.notificationsOpen }));
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {state.notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </button>

                {state.notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Notifications</h3>
                      <span className="text-xs text-gray-500">{state.notifications.length} unread</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {state.notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-500 text-sm">
                          No new notifications
                        </div>
                      ) : (
                        state.notifications.map((notification, index) => (
                          <div key={notification.id || index} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors cursor-pointer">
                            <p className="text-sm text-gray-800 font-medium">{notification.title || 'Notification'}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.message || notification.content || 'No details'}</p>
                            <p className="text-xs text-indigo-500 mt-1">{notification.created_at ? new Date(notification.created_at).toLocaleDateString() : 'Just now'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState(prev => ({ ...prev, showUserMenu: !prev.showUserMenu, notificationsOpen: false }));
                  }}
                  className="flex items-center focus:outline-none"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'User'}
                      className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-white hover:ring-indigo-100 transition-all"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm ring-2 ring-white hover:ring-indigo-100 transition-all">
                      {user?.name?.charAt(0).toUpperCase() || 'I'}
                    </div>
                  )}
                </button>

                {/* Dropdown */}
                {state.showUserMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Instructor'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || 'No email'}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        to="/instructor/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile
                      </Link>
                      <Link
                        to="/instructor/profile?tab=settings"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setState(prev => ({ ...prev, showUserMenu: false }))}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Settings
                      </Link>
                    </div>
                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={() => logout()}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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

          {/* Bottom Row: Navigation Tabs */}
          <div className="flex items-center -mb-px space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
            {['overview', 'courses', 'students', 'submissions', 'analytics', 'earnings', 'messages'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setState(prev => ({ ...prev, activeTab: tab }));
                  if (tab === 'submissions') fetchSubmissions();
                  if (tab === 'earnings') fetchEarnings();
                }}
                className={`flex items-center py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${state.activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab === 'overview' && <BarChart3 className="w-4 h-4 mr-2" />}
                {tab === 'courses' && <BookOpen className="w-4 h-4 mr-2" />}
                {tab === 'students' && <Users className="w-4 h-4 mr-2" />}
                {tab === 'submissions' && <FileUp className="w-4 h-4 mr-2" />}
                {tab === 'analytics' && <BarChart3 className="w-4 h-4 mr-2" />}
                {tab === 'earnings' && <IndianRupee className="w-4 h-4 mr-2" />}
                {tab === 'messages' && <MessageSquare className="w-4 h-4 mr-2" />}
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.activeTab === 'overview' && renderOverview()}
        {state.activeTab === 'courses' && renderCourses()}
        {state.activeTab === 'students' && renderStudents()}
        {state.activeTab === 'submissions' && renderSubmissions()}
        {state.activeTab === 'analytics' && renderAnalytics()}
        {state.activeTab === 'earnings' && renderEarnings()}
        {state.activeTab === 'messages' && renderMessages()}
      </div>

      {/* Create Course Modal */}
      <Dialog
        open={state.showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            setState(prev => ({
              ...prev,
              showCreateModal: false,
              courseToEdit: null,
              formData: {
                title: '',
                description: '',
                thumbnail_url: '',
                category: 'General',
                price: 0,
                difficulty: 'beginner',
                tags: [],
                status: 'draft',
                completion_status: 'ongoing'
              }
            }));
          } else {
            setState(prev => ({ ...prev, showCreateModal: true }));
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{state.courseToEdit ? 'Edit Course' : 'Create New Course'}</DialogTitle>
            <DialogDescription>
              {state.courseToEdit ? 'Update the details of your course below.' : 'Enter the details below to create a new course.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  value={state.formData.title}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, title: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  placeholder="e.g., Introduction to Web Development"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={state.formData.category}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, category: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="General">General</option>
                  <option value="Programming">Programming</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Language">Language</option>
                  <option value="Art">Art</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={state.formData.description}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, description: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows="4"
                required
                placeholder="Describe what students will learn in this course..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={state.formData.price}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, price: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={state.formData.difficulty}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, difficulty: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={state.formData.status}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, status: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Status</label>
                <select
                  value={state.formData.completion_status}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, completion_status: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="ongoing">Ongoing (Living)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thumbnail URL (optional)
              </label>
              <input
                type="url"
                value={state.formData.thumbnail_url}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, thumbnail_url: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://example.com/thumbnail.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended size: 1280x720 pixels
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, showCreateModal: false }))}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={state.isLoading}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {state.isLoading ? (state.courseToEdit ? 'Updating...' : 'Creating...') : (state.courseToEdit ? 'Update Course' : 'Create Course')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Course Modal */}
      <Dialog open={state.showDeleteModal} onOpenChange={(open) => !open && setState(prev => ({ ...prev, showDeleteModal: false, courseToDelete: null }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please be certain.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-center text-gray-700 mb-2">
              Are you sure you want to delete the course:
            </p>
            <p className="text-center font-semibold text-lg mb-4">
              "{state.courseToDelete?.title || 'Untitled Course'}"
            </p>
            <p className="text-center text-sm text-gray-600 mb-6">
              This action cannot be undone. All course data, including lectures, assignments, and student submissions will be permanently deleted.
            </p>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setState(prev => ({
                  ...prev,
                  showDeleteModal: false,
                  courseToDelete: null
                }))}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={state.isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {state.isLoading ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submission Grading Modal */}
      <Dialog
        open={state.showSubmissionModal}
        onOpenChange={(open) => !open && setState(prev => ({ ...prev, showSubmissionModal: false, selectedSubmission: null }))}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Review the student's submission and provide a grade.
            </DialogDescription>
          </DialogHeader>

          {state.selectedSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Student</p>
                  <p className="font-semibold">{state.selectedSubmission.student_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Assignment</p>
                  <p className="font-semibold">{state.selectedSubmission.assignment_title}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted Date</p>
                  <p className="font-medium">{formatDate(state.selectedSubmission.submitted_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Current Status</p>
                  <p className={`font-medium capitalize ${state.selectedSubmission.status === 'graded' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                    {state.selectedSubmission.status || 'pending'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-2">
                  {state.selectedSubmission.assignment_type === 'quiz' ? 'Quiz Answers' : 'Submission Content'}
                </h4>

                {state.selectedSubmission.assignment_type === 'quiz' ? (
                  <div className="space-y-4">
                    {/* Quiz Stats */}
                    {(() => {
                      const totalQuestions = state.selectedSubmission.assignment_questions?.length || 0;
                      const correctCount = state.selectedSubmission.assignment_questions?.reduce((acc, question, index) => {
                        const answer = state.selectedSubmission.answers?.find(a => a.question_index === index);
                        return (answer?.selected_option_index === question.correct_option_index) ? acc + 1 : acc;
                      }, 0) || 0;
                      const wrongCount = totalQuestions - correctCount;

                      return (
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                            <p className="text-xs text-green-600 font-medium uppercase">Correct</p>
                            <p className="text-xl font-bold text-green-700">{correctCount}</p>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                            <p className="text-xs text-red-600 font-medium uppercase">Incorrect</p>
                            <p className="text-xl font-bold text-red-700">{wrongCount}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                            <p className="text-xs text-gray-600 font-medium uppercase">Total</p>
                            <p className="text-xl font-bold text-gray-700">{totalQuestions}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                            <p className="text-xs text-blue-600 font-medium uppercase">Score</p>
                            <p className="text-xl font-bold text-blue-700">
                              {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {state.selectedSubmission.assignment_questions?.map((question, index) => {
                      const answer = state.selectedSubmission.answers?.find(a => a.question_index === index);


                      return (
                        <div key={index} className="bg-white p-4 rounded border">
                          <p className="font-medium text-gray-800 mb-2">{index + 1}. {question.question_text}</p>
                          <div className="space-y-2">
                            {question.options.map((option, optIdx) => {
                              const isSelected = answer?.selected_option_index === optIdx;
                              const isCorrectOption = question.correct_option_index === optIdx;

                              let optionClass = "p-2 rounded border text-sm flex items-center justify-between ";
                              if (isSelected && isCorrectOption) {
                                optionClass += "bg-green-50 border-green-200 text-green-700";
                              } else if (isSelected && !isCorrectOption) {
                                optionClass += "bg-red-50 border-red-200 text-red-700";
                              } else if (isCorrectOption) {
                                optionClass += "bg-green-50 border-green-200 text-green-800 opacity-75";
                              } else {
                                optionClass += "bg-gray-50 border-gray-100 text-gray-600";
                              }

                              return (
                                <div key={optIdx} className={optionClass}>
                                  <span>{option}</span>
                                  {isSelected && (
                                    <span className="text-xs font-semibold uppercase">
                                      {isCorrectOption ? '(Correct)' : '(Your Answer)'}
                                    </span>
                                  )}
                                  {!isSelected && isCorrectOption && (
                                    <span className="text-xs font-semibold uppercase">(Correct Answer)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {state.selectedSubmission.text_content && (
                      <div className="bg-white p-3 rounded border mb-3 whitespace-pre-wrap text-sm">
                        {state.selectedSubmission.text_content}
                      </div>
                    )}

                    {state.selectedSubmission.file_url ? (
                      <a
                        href={state.selectedSubmission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-white border rounded text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        <span>View Attached File</span>
                      </a>
                    ) : (
                      !state.selectedSubmission.text_content && <p className="text-gray-500 italic">No content submitted.</p>
                    )}
                  </>
                )}
              </div>

              <form onSubmit={handleUpdateGrade} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={state.gradingData.grade}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      gradingData: { ...prev.gradingData, grade: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter grade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                  <textarea
                    rows="4"
                    value={state.gradingData.feedback}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      gradingData: { ...prev.gradingData, feedback: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Provide feedback to the student..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, showSubmissionModal: false }))}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={state.gradingLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {state.gradingLoading ? 'Saving...' : 'Save Grade'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ChangePasswordModal
        isOpen={state.showChangePasswordModal}
        onClose={() => setState(prev => ({ ...prev, showChangePasswordModal: false }))}
      />

      {/* Footer */}

    </div >
  );
}

export default InstructorDashboard;