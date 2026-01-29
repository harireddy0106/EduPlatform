import React from 'react';
import { BookOpen, Users, Award, Globe } from 'lucide-react';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const About = () => {
    const navigate = useNavigate();
    const { user } = React.useContext(AuthContext);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Simple Header */}
            <nav className="flex justify-between items-center px-8 py-4 bg-white border-b">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">EduPlatform</h1>
                </div>
                <div>
                    {user ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Dashboard</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-sky-600 font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Home</span>
                        </button>
                    )}
                </div>

            </nav>

            <main className="flex-grow">
                {/* Hero Section */}
                <div className="bg-sky-50 py-20 px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            Empowering the World to Learn
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            We believe that education is the key to unlocking human potential. Our mission is to make high-quality learning accessible to everyone, everywhere.
                        </p>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="py-16 px-8 bg-white">
                    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center p-6 bg-gray-50 rounded-xl">
                            <Users className="w-8 h-8 text-sky-600 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-gray-900 mb-1">10k+</div>
                            <div className="text-gray-600">Students</div>
                        </div>
                        <div className="text-center p-6 bg-gray-50 rounded-xl">
                            <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-gray-900 mb-1">500+</div>
                            <div className="text-gray-600">Courses</div>
                        </div>
                        <div className="text-center p-6 bg-gray-50 rounded-xl">
                            <Award className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-gray-900 mb-1">1k+</div>
                            <div className="text-gray-600">Instructors</div>
                        </div>
                        <div className="text-center p-6 bg-gray-50 rounded-xl">
                            <Globe className="w-8 h-8 text-green-600 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-gray-900 mb-1">20+</div>
                            <div className="text-gray-600">Countries</div>
                        </div>
                    </div>
                </div>

                {/* Story Section */}
                <div className="py-20 px-8">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
                        <div className="prose prose-lg text-gray-600">
                            <p className="mb-6">
                                Founded in 2024, EduPlatform started with a simple idea: that technology could bridge the gap between eager learners and expert knowledge. What began as a small project has grown into a global community of lifelong learners.
                            </p>
                            <p className="mb-6">
                                We're building more than just a Learning Management System; we're building a vibrant ecosystem where knowledge flows freely. Whether you're a student looking to upskill, or an expert wanting to share your passion, EduPlatform gives you the tools to succeed.
                            </p>
                            <p>
                                Our team is dedicated to creating the most intuitive, engaging, and effective learning experience possible. We're constantly innovating, listening to our users, and pushing the boundaries of what online education can be.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default About;
