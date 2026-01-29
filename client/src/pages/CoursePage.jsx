import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import ReactPlayer from 'react-player';
import { ArrowLeft, Upload, Plus, Trash2, Play, FileText, MessageSquare, Send, Pencil, Check, X, Download, Clock, Trophy, Edit, MoreVertical, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CoursePage() {
  const { courseId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [completedLectures, setCompletedLectures] = useState([]);


  // Modals
  const [showAddLecture, setShowAddLecture] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showSubmitAssignment, setShowSubmitAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingLectureId, setEditingLectureId] = useState(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  // Forms
  const [lectureForm, setLectureForm] = useState({ title: '', video_url: '', order: 1 });
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    due_date: '',
    type: 'file',
    questions: []
  });
  const [quizAnswers, setQuizAnswers] = useState({}); // { questionIndex: optionIndex }
  const [uploading, setUploading] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleForm, setTitleForm] = useState('');
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [editCourseForm, setEditCourseForm] = useState({
    title: '',
    description: '',
    category: 'General',
    price: 0,
    difficulty: 'beginner',
    status: 'draft',
    completion_status: 'ongoing',
    thumbnail_url: ''
  });

  useEffect(() => {
    if (course) {
      setTitleForm(course.title);
      setEditCourseForm({
        title: course.title,
        description: course.description,
        category: course.category || 'General',
        price: course.price || 0,
        difficulty: course.difficulty || 'beginner',
        status: course.status || 'draft',
        completion_status: course.completion_status || 'ongoing',
        thumbnail_url: course.thumbnail_url || ''
      });
      if (course.user_progress?.completed_lessons) {
        setCompletedLectures(course.user_progress.completed_lessons);
      }
    }
  }, [course]);

  const handleUpdateTitle = async () => {
    if (!titleForm.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    try {
      await axios.put(`${API}/courses/${courseId}`, { ...course, title: titleForm }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCourse({ ...course, title: titleForm });
      setIsEditingTitle(false);
      toast.success('Course title updated');
    } catch {
      toast.error('Failed to update title');
    }
  };

  const handleUpdateCourseDetails = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API}/courses/${courseId}`, editCourseForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setCourse({ ...course, ...editCourseForm });
        setShowEditCourseModal(false);
        toast.success('Course updated successfully');
      }
    } catch {
      toast.error('Failed to update course details');
    }
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm("Are you sure you want to delete this ENTIRE course? This cannot be undone.")) return;

    try {
      await axios.delete(`${API}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Course deleted');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete course');
    }
  };

  useEffect(() => {
    fetchCourse();
    fetchLectures();
    fetchAssignments();
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      // Sanitize courseId
      const cleanId = courseId.split(' ')[0];
      const response = await axios.get(`${API}/courses/${cleanId}`, config);
      setCourse(response.data.data);
      setIsInstructor(user?.role === 'instructor' && response.data.data.instructor_id === user?.id || user?.role === 'admin');
    } catch {
      toast.error('Failed to load course');
    }
  };

  const fetchLectures = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const cleanId = courseId.split(' ')[0];
      const response = await axios.get(`${API}/courses/${cleanId}/lectures`, config);
      const lecturesData = response.data.data || [];
      setLectures(lecturesData);
      if (lecturesData.length > 0 && !currentVideo) {
        setCurrentVideo(lecturesData[0]);
      }
    } catch {
      toast.error('Failed to load lectures');
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const cleanId = courseId.split(' ')[0];
      const response = await axios.get(`${API}/courses/${cleanId}/assignments`, config);
      setAssignments(response.data.data || []);
    } catch {
      toast.error('Failed to load assignments');
    }
  };

  const fetchMessages = async () => {
    // Only fetch messages if enrolled or instructor
    if (!course?.is_enrolled && !isInstructor) return;

    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const cleanId = courseId.split(' ')[0];
      const response = await axios.get(`${API}/courses/${cleanId}/messages`, config);
      setMessages(response.data.data || []);
    } catch {
      // Silent fail for polling
    }
  };

  const handleVideoEnded = async () => {
    if (!currentVideo || isInstructor) return;
    try {
      const response = await axios.post(
        `${API}/courses/${courseId}/lectures/${currentVideo.id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setCompletedLectures(response.data.data.completed_lessons);
        setCourse((prev) => ({
          ...prev,
          user_progress: response.data.data
        }));
        toast.success("Lecture completed!");
      }
    } catch (error) {
      console.error("Failed to mark lecture as complete", error);
    }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resource_type', 'video');

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 300000, // 5 minutes
      });
      setLectureForm({ ...lectureForm, video_url: response.data.data.url });
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Upload Error Details:', error.response || error);
      toast.error(error.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resource_type', 'auto');

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 300000, // 5 minutes
      });
      setSubmissionUrl(response.data.data.url);
      setSubmissionUrl(response.data.data.url);
      toast.success('File uploaded!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAddQuestion = () => {
    setAssignmentForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question_text: '', options: ['', ''], correct_option_index: 0 }
      ]
    }));
  };

  const handleUpdateQuestion = (index, field, value) => {
    const newQuestions = [...assignmentForm.questions];
    newQuestions[index][field] = value;
    setAssignmentForm(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...assignmentForm.questions];
    newQuestions[qIndex].options[oIndex] = value;
    setAssignmentForm(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleAddOption = (qIndex) => {
    const newQuestions = [...assignmentForm.questions];
    newQuestions[qIndex].options.push('');
    setAssignmentForm(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = assignmentForm.questions.filter((_, i) => i !== index);
    setAssignmentForm(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleAddLecture = async (e) => {
    e.preventDefault();

    if (!lectureForm.video_url) {
      toast.error('Please upload a video first');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      if (editingLectureId) {
        await axios.put(`${API}/lectures/${editingLectureId}`, lectureForm, config);
        toast.success('Lecture updated!');
      } else {
        await axios.post(`${API}/courses/${courseId}/lectures`, {
          ...lectureForm,
          duration: 0 // Default duration if not available
        }, config);
        toast.success('Lecture added!');
      }

      setShowAddLecture(false);
      setLectureForm({ title: '', video_url: '', order: 1 });
      setEditingLectureId(null);
      fetchLectures();
    } catch {
      toast.error(editingLectureId ? 'Failed to update lecture' : 'Failed to add lecture');
    }
  };

  const handleEditLecture = (lecture) => {
    setEditingLectureId(lecture.id);
    setLectureForm({
      title: lecture.title,
      video_url: lecture.video_url,
      order: lecture.order
    });
    setShowAddLecture(true);
  };

  const handleOpenAddLecture = () => {
    setEditingLectureId(null);
    setLectureForm({ title: '', video_url: '', order: lectures.length + 1 });
    setShowAddLecture(true);
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      if (editingAssignmentId) {
        await axios.put(`${API}/assignments/${editingAssignmentId}`, assignmentForm, config);
        toast.success('Assignment updated!');
      } else {
        await axios.post(`${API}/courses/${courseId}/assignments`, assignmentForm, config);
        toast.success('Assignment added!');
      }

      setShowAddAssignment(false);
      setAssignments({
        title: '',
        description: '',
        due_date: '',
        type: 'file',
        questions: []
      });
      fetchAssignments();
    } catch {
      toast.error(editingAssignmentId ? 'Failed to update assignment' : 'Failed to add assignment');
    }
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description,
      due_date: assignment.due_date,
      type: assignment.type || 'file',
      questions: assignment.questions || []
    });
    setShowAddAssignment(true);
  };

  const handleOpenAddAssignment = () => {
    setEditingAssignmentId(null);
    setAssignmentForm({
      title: '',
      description: '',
      due_date: '',
      type: 'file',
      questions: []
    });
    setShowAddAssignment(true);
  };

  const handleSubmitAssignment = async () => {
    if (selectedAssignment.type !== 'quiz' && !submissionUrl && !selectedAssignment.isSubmitted) {
      toast.error('Please upload a file first');
      return;
    }

    try {
      const method = 'post'; // Always use POST as backend handles upsert (create or update)

      let payload;
      if (selectedAssignment.type === 'quiz') {
        const answers = Object.entries(quizAnswers).map(([qIdx, oIdx]) => ({
          question_index: parseInt(qIdx),
          selected_option_index: parseInt(oIdx)
        }));
        payload = {
          assignment_id: selectedAssignment.id,
          answers
        };
      } else {
        payload = {
          assignment_id: selectedAssignment.id,
          file_url: submissionUrl || selectedAssignment.submission?.file_url // Keep existing file if not updating
        };
      }

      await axios[method](
        `${API}/assignments/${selectedAssignment.id}/submit`,
        payload,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      toast.success(
        selectedAssignment.isSubmitted ? 'Submission updated!' : 'Assignment submitted!'
      );
      setShowSubmitAssignment(false);
      setSubmissionUrl('');
      setSelectedAssignment(null);
      fetchAssignments(); // refresh to mark submitted=true
    } catch (error) {
      console.error('Submit assignment error:', error);
      const errorMessage = error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Submission failed';
      toast.error(errorMessage);
    }
  };

  // ... (inside return)

  <button
    onClick={handleSubmitAssignment}
    className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
  >
    {selectedAssignment?.isSubmitted ? 'Update Submission' : 'Submit'}
  </button>

  const handleOpenSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    if (assignment.type === 'quiz' && assignment.isSubmitted && assignment.submission?.answers) {
      // Pre-fill answers from submission for review
      const answersMap = {};
      assignment.submission.answers.forEach(a => {
        answersMap[a.question_index] = a.selected_option_index;
      });
      setQuizAnswers(answersMap);
    } else {
      setQuizAnswers({});
      setSubmissionUrl('');
    }
    setShowSubmitAssignment(true);
  };

  const handleDeleteSubmission = async (submissionId, assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;

    try {
      await axios.delete(`${API}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Submission deleted");
      fetchSubmissions(assignmentId); // refresh the submissions list
    } catch (error) {
      console.error("Delete submission error:", error);
      toast.error("Failed to delete submission");
    }
  };


  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm('Delete this lecture?')) return;
    try {
      await axios.delete(`${API}/lectures/${lectureId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Lecture deleted');
      fetchLectures();
    } catch {
      toast.error('Failed to delete lecture');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Delete this assignment?")) return;

    try {
      await axios.delete(`${API}/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Assignment deleted");
      fetchAssignments(); // Refresh the list
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete assignment");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      await axios.post(`${API}/courses/${courseId}/messages`, {
        sender_id: user.id,
        sender_name: user.name,
        sender_role: user.role,
        message: messageText
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setMessageText('');
      fetchMessages(); // reload chat
    } catch {
      toast.error('Failed to send message');
    }
  };
  const fetchSubmissions = async (assignmentId) => {
    try {
      const response = await axios.get(`${API}/submissions/${assignmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubmissions((prev) => ({ ...prev, [assignmentId]: response.data.data || [] }));
    } catch {
      toast.error('Failed to load submissions');
    }
  };

  const toggleAssignmentDropdown = (assignmentId) => {
    if (expandedAssignmentId === assignmentId) {
      setExpandedAssignmentId(null);
    } else {
      setExpandedAssignmentId(assignmentId);
      fetchSubmissions(assignmentId);
    }
  };


  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="glass-effect shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            data-testid="back-to-dashboard-btn"
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-700 hover:text-sky-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center space-x-4">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={titleForm}
                  onChange={(e) => setTitleForm(e.target.value)}
                  className="text-3xl font-bold text-gray-900 border-b-2 border-sky-500 focus:outline-none bg-transparent"
                  autoFocus
                />
                <button
                  onClick={handleUpdateTitle}
                  className="p-1 text-green-600 hover:bg-green-100 rounded-full"
                >
                  <Check className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                {isInstructor && (
                  <div className="relative">
                    <button
                      onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {showOptionsDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                        <button
                          onClick={() => {
                            setShowEditCourseModal(true);
                            setShowOptionsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <Edit className="w-4 h-4 mr-2 text-gray-500" />
                          Edit Details
                        </button>
                        <button
                          onClick={() => {
                            setShowOptionsDropdown(false);
                            handleDeleteCourse();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Course
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-1">By {course.instructor_name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="lectures" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="lectures" data-testid="tab-lectures">Lectures</TabsTrigger>
                <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
                <TabsTrigger value="chat" data-testid="tab-chat">Chat</TabsTrigger>
              </TabsList>

              {/* Lectures Tab */}
              <TabsContent value="lectures">
                <div className="glass-effect rounded-xl overflow-hidden mb-6">
                  {currentVideo ? (
                    <div>
                      <video
                        key={currentVideo.video_url}
                        width="100%"
                        height="400"
                        controls
                        onEnded={handleVideoEnded}
                        className='react-player'
                      >
                        <source src={currentVideo.video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="p-4">
                        <h3 className="text-xl font-semibold text-gray-900">{currentVideo.title}</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      No video selected
                    </div>
                  )}
                </div>

                {isInstructor && (
                  <button
                    data-testid="add-lecture-btn"
                    onClick={handleOpenAddLecture}
                    className="mb-4 flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Lecture</span>
                  </button>
                )}

                <div className="space-y-2" data-testid="lectures-list">
                  {Array.isArray(lectures) && lectures.map((lecture) => (
                    <div
                      key={lecture.id}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer ${currentVideo?.id === lecture.id
                        ? 'bg-sky-100 border-2 border-sky-500'
                        : completedLectures.includes(lecture.id)
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-white border border-gray-200'
                        }`}
                      onClick={() => setCurrentVideo(lecture)}
                      data-testid={`lecture-item-${lecture.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        {completedLectures.includes(lecture.id) ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Play className={`w-5 h-5 ${currentVideo?.id === lecture.id ? 'text-sky-600' : 'text-gray-400'}`} />
                        )}
                        <span className={`font-medium ${completedLectures.includes(lecture.id) ? 'text-green-900' : 'text-gray-800'}`}>
                          {lecture.title}
                        </span>
                      </div>
                      {isInstructor && (
                        <div className="flex space-x-1">
                          <button
                            data-testid={`edit-lecture-btn-${lecture.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLecture(lecture);
                            }}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            data-testid={`delete-lecture-btn-${lecture.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLecture(lecture.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments">
                {/*  Add Assignment Button (for instructors only) */}
                {isInstructor && (
                  <button
                    data-testid="add-assignment-btn"
                    onClick={handleOpenAddAssignment}
                    className="mb-4 flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Assignment</span>
                  </button>
                )}

                <div className="space-y-4" data-testid="assignments-list">
                  {Array.isArray(assignments) && assignments.map((assignment) => (
                    <div key={assignment.id} className="glass-effect rounded-xl p-5">
                      <div
                        className="flex justify-between items-start cursor-pointer"
                        onClick={() => toggleAssignmentDropdown(assignment.id)}
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h3>
                          <p className="text-gray-600 mb-2">{assignment.description}</p>
                          <p className="text-sm text-gray-500 mb-3">Due: {assignment.due_date}</p>
                          {assignment.submission?.grade && (
                            <p className="text-sm font-semibold text-green-600 mb-3">
                              Score: {assignment.submission.grade} ({Math.round(assignment.submission.score)}%)
                            </p>
                          )}

                          {user.role === 'student' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSubmitModal(assignment);
                              }}
                              className={`px-4 py-2 rounded-lg text-white ${assignment.isSubmitted
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-sky-600 hover:bg-sky-700'
                                }`}
                            >
                              {assignment.isSubmitted
                                ? (assignment.type === 'quiz' ? 'Review Quiz' : 'Update Submission')
                                : 'Submit Assignment'}
                            </button>
                          )}
                        </div>

                        {isInstructor && (
                          <div className="flex space-x-1">
                            <button
                              data-testid={`edit-assignment-btn-${assignment.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAssignment(assignment);
                              }}
                              className="p-2 text-sky-600 hover:bg-sky-50 rounded"
                              title="Edit Assignment"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              data-testid={`delete-assignment-btn-${assignment.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAssignment(assignment.id);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                              title="Delete Assignment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dropdown section */}
                      {expandedAssignmentId === assignment.id && isInstructor && (
                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <h4 className="font-semibold text-gray-800 mb-2">Student Submissions</h4>
                          {submissions[assignment.id] ? (
                            submissions[assignment.id].length > 0 ? (
                              <ul className="space-y-2">
                                {submissions[assignment.id].map((sub) => (
                                  <li
                                    key={sub.id}
                                    className="flex justify-between items-center bg-gray-50 p-2 rounded-lg"
                                  >
                                    <div>
                                      <strong>{sub.student_name}</strong>{" "}
                                      <span className="text-gray-500 text-sm">
                                        ({new Date(sub.submitted_at).toLocaleString()})
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                      <a
                                        href={sub.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sky-600 hover:underline"
                                      >
                                        View File
                                      </a>

                                      {(user.role === "instructor" || user.role === "admin") && (
                                        <button
                                          onClick={() => handleDeleteSubmission(sub.id, assignment.id)}
                                          className="text-red-500 hover:bg-red-100 p-1 rounded"
                                          title="Delete Submission"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                ))}

                              </ul>
                            ) : (
                              <p className="text-gray-500 text-sm">No submissions yet</p>
                            )
                          ) : (
                            <p className="text-gray-400 text-sm italic">Loading...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </TabsContent>


              {/* Chat Tab */}
              <TabsContent value="chat">
                <div className="glass-effect rounded-xl p-5">
                  <div className="h-96 overflow-y-auto mb-4 space-y-3" data-testid="chat-messages">
                    {Array.isArray(messages) && messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${msg.sender_id === user.id ? 'bg-sky-100 ml-auto' : 'bg-white'
                          } max-w-xs`}
                        data-testid={`message-${msg.id}`}
                      >
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          {msg.sender_name} <span className="text-gray-500">({msg.sender_role})</span>
                        </p>
                        <p className="text-sm text-gray-800">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      data-testid="chat-input"
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                    <button
                      data-testid="send-message-btn"
                      type="submit"
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-effect rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Course Overview</h3>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Lectures:</strong> {lectures.length}</p>
                <p><strong>Assignments:</strong> {assignments.length}</p>
                <p className="capitalize"><strong>Status:</strong> {course.user_progress?.enrollment_status === 'completed' ? 'Completed' : (course.completion_status === 'completed' ? 'Completed' : 'Ongoing')}</p>
              </div>
            </div>

            {/* Certificate & Progress Section */}
            {course.user_progress && (
              <div className="glass-effect rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Your Progress
                </h3>

                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${course.user_progress.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mb-4 flex justify-between">
                  <span>{course.user_progress.progress || 0}% Completed</span>
                </p>

                {course.user_progress.certificate ? (
                  <div className="flex flex-col space-y-2">
                    <Link
                      to={`/certificate/${course.user_progress.certificate.verification_code}`}
                      target="_blank"
                      className="w-full flex items-center justify-center py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Certificate
                    </Link>
                    <Link
                      to={`/certificate/${course.user_progress.certificate.verification_code}`}
                      target="_blank"
                      className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Certificate
                    </Link>
                  </div>
                ) : (course.user_progress.progress === 100 || course.user_progress.progress === 101) ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium flex items-center mb-1">
                      <Clock className="w-4 h-4 mr-2" />
                      Certificate Pending
                    </p>
                    <p className="opacity-90">
                      {'Your certificate is being generated.'}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Lecture Modal */}
      <Dialog open={showAddLecture} onOpenChange={setShowAddLecture}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLectureId ? 'Edit Lecture' : 'Add Lecture'}</DialogTitle>
            <DialogDescription>
              {editingLectureId ? 'Update the details of your lecture.' : 'Upload a video and provide lecture details.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLecture} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                data-testid="lecture-title-input"
                type="text"
                value={lectureForm.title}
                onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video</label>
              <input
                data-testid="lecture-video-upload"
                type="file"
                accept="video/*"
                onChange={handleUploadVideo}
                className="w-full"
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              {lectureForm.video_url && <p className="text-sm text-green-600 mt-1">Video uploaded!</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input
                data-testid="lecture-order-input"
                type="number"
                value={lectureForm.order}
                onChange={(e) => setLectureForm({ ...lectureForm, order: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                required
              />
            </div>
            <button
              data-testid="lecture-submit-btn"
              type="submit"
              className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              {editingLectureId ? 'Update Lecture' : 'Add Lecture'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Assignment Modal */}
      <Dialog open={showAddAssignment} onOpenChange={setShowAddAssignment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAssignmentId ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
            <DialogDescription>
              {editingAssignmentId ? 'Modify the existing assignment details.' : 'Create a new assignment or quiz for students.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAssignment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                rows="3"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignmentForm.due_date}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={assignmentForm.type}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="file">File Upload</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
            </div>

            {assignmentForm.type === 'quiz' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Questions</h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="text-sm text-sky-600 hover:text-sky-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Question
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                  {assignmentForm.questions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-gray-50 p-3 rounded-lg border relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        placeholder="Question Text"
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'question_text', e.target.value)}
                        className="w-full mb-2 px-3 py-1.5 border rounded"
                        required
                      />

                      <div className="space-y-2 ml-4">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={q.correct_option_index === oIdx}
                              onChange={() => handleUpdateQuestion(qIdx, 'correct_option_index', oIdx)}
                            />
                            <input
                              type="text"
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                              className="flex-1 px-2 py-1 border rounded text-sm"
                              required
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-xs text-sky-600 hover:underline ml-6"
                        >
                          + Add Option
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              {editingAssignmentId ? 'Update Assignment' : 'Add Assignment'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={showEditCourseModal} onOpenChange={setShowEditCourseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Course Details</DialogTitle>
            <DialogDescription>
              Update the details of your course below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCourseDetails} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
              <input
                type="text"
                value={editCourseForm.title}
                onChange={(e) => setEditCourseForm({ ...editCourseForm, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editCourseForm.description}
                onChange={(e) => setEditCourseForm({ ...editCourseForm, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows="4"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={editCourseForm.price}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={editCourseForm.difficulty}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editCourseForm.status}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, status: e.target.value })}
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
                  value={editCourseForm.completion_status}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, completion_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditCourseModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Update Course
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Assignment Modal */}
      <Dialog open={showSubmitAssignment} onOpenChange={setShowSubmitAssignment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment?.type === 'quiz'
                ? (selectedAssignment.isSubmitted ? 'Quiz Results' : 'Take Quiz')
                : 'Submit Assignment'}
            </DialogTitle>
            <DialogDescription>
              {selectedAssignment?.type === 'quiz'
                ? (selectedAssignment.isSubmitted ? 'Review your answers below.' : 'Answer the questions below to complete the quiz.')
                : 'Upload your file to submit this assignment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAssignment?.type === 'quiz' ? (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {selectedAssignment.questions?.map((q, qIdx) => (
                  <div key={qIdx} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-900 mb-3">
                      {qIdx + 1}. {q.question_text}
                    </p>
                    <div className="space-y-2">
                      {q.options?.map((opt, oIdx) => {
                        // Determine validation styles if reviewing
                        let optionStyle = "flex items-start space-x-3 cursor-pointer p-2 rounded border border-transparent";
                        if (selectedAssignment.isSubmitted) {
                          if (oIdx === q.correct_option_index) {
                            optionStyle = "flex items-start space-x-3 p-2 rounded bg-green-50 border border-green-500";
                          } else if (quizAnswers[qIdx] === oIdx && oIdx !== q.correct_option_index) {
                            optionStyle = "flex items-start space-x-3 p-2 rounded bg-red-50 border border-red-500";
                          } else {
                            optionStyle = "flex items-start space-x-3 p-2 rounded opacity-50";
                          }
                        } else {
                          optionStyle += " hover:bg-gray-100";
                        }

                        return (
                          <label key={oIdx} className={optionStyle}>
                            <input
                              type="radio"
                              name={`question-${qIdx}`}
                              checked={quizAnswers[qIdx] === oIdx}
                              onChange={() => !selectedAssignment.isSubmitted && setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                              className="mt-1"
                              disabled={selectedAssignment.isSubmitted}
                            />
                            <span className="text-gray-700">{opt}</span>
                            {selectedAssignment.isSubmitted && oIdx === q.correct_option_index && (
                              <span className="text-xs text-green-600 font-semibold ml-auto">Correct Answer</span>
                            )}
                            {selectedAssignment.isSubmitted && quizAnswers[qIdx] === oIdx && oIdx !== q.correct_option_index && (
                              <span className="text-xs text-red-600 font-semibold ml-auto">Your Answer</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                <input
                  type="file"
                  onChange={handleUploadFile}
                  className="w-full"
                />
                {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                {submissionUrl && <p className="text-sm text-green-600 mt-1">File uploaded!</p>}
              </div>
            )}

            <button
              onClick={handleSubmitAssignment}
              className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              {selectedAssignment?.isSubmitted ? 'Update Submission' : 'Submit'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CoursePage;

