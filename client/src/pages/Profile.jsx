import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { User, Mail, Shield, Calendar, Edit2, Save, X, Camera, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import StudentProfile from './StudentProfile';
import InstructorProfile from './InstructorProfile';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GenericProfile = () => {
    const { user, updateUserProfile } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = React.useRef(null);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('context', 'profile_picture');
        uploadData.append('contextId', user.id);

        const toastId = toast.loading("Uploading image...");

        try {
            const uploadRes = await axios.post(`${API}/upload`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (uploadRes.data.success) {
                const newAvatarUrl = uploadRes.data.data.url;
                await updateUserProfile({ avatar: newAvatarUrl });
                toast.success("Profile picture updated!", { id: toastId });
            }
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image", { id: toastId });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteAvatar = async () => {
        if (!confirm("Are you sure you want to remove your profile photo?")) return;
        const toastId = toast.loading("Removing photo...");
        try {
            await updateUserProfile({ avatar: null });
            toast.success("Profile photo removed", { id: toastId });
        } catch (error) {
            console.error("Remove photo failed", error);
            toast.error("Failed to remove photo", { id: toastId });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateUserProfile(formData);
            setIsEditing(false);
            toast.success('Profile updated successfully');
        } catch {
            toast.error('Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">User Profile</h1>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="h-32 bg-indigo-500"></div>
                <div className="px-8 pb-8">
                    <div className="relative -mt-16 mb-6 flex justify-between items-end">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-white bg-indigo-100 flex items-center justify-center text-4xl font-bold text-indigo-600 shadow-md overflow-hidden relative">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            <div className="absolute bottom-0 -right-2 flex space-x-1">
                                {user?.avatar && (
                                    <button
                                        onClick={handleDeleteAvatar}
                                        className="p-2 bg-white rounded-full shadow-md border hover:bg-red-50 text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-white rounded-full shadow-md border hover:bg-gray-50 text-gray-600 transition-colors"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-white border rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 flex items-center"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({ name: user?.name || '', email: user?.email || '' });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                                    <p className="text-gray-500">{user?.role?.toUpperCase()}</p>
                                </div>
                                <div className="space-y-3 pt-4">
                                    <div className="flex items-center text-gray-700">
                                        <Mail className="w-5 h-5 mr-3 text-gray-400" />
                                        <span>{user?.email}</span>
                                    </div>
                                    <div className="flex items-center text-gray-700">
                                        <Shield className="w-5 h-5 mr-3 text-gray-400" />
                                        <span className="capitalize">{user?.role} Account</span>
                                    </div>
                                    <div className="flex items-center text-gray-700">
                                        <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                                        <span>Joined {formatDate(user?.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Profile = () => {
    const { user } = useContext(AuthContext);

    if (user?.role === 'student') return <StudentProfile />;
    if (user?.role === 'instructor') return <InstructorProfile />;
    return <GenericProfile />;
};

export default Profile;
