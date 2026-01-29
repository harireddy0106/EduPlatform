import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Users, MessageSquare } from 'lucide-react';
import Footer from '@/components/Footer';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 opacity-70"></div>

        <nav className="relative z-10 flex justify-between items-center px-8 py-6">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-8 h-8 text-sky-600" />
            <h1 className="text-2xl font-bold text-gray-800">EduPlatform</h1>
          </div>
          <div className="space-x-4">
            <button
              data-testid="landing-login-btn"
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sky-600 font-medium hover:text-sky-700 transition-colors"
            >
              Login
            </button>
            <button
              data-testid="landing-register-btn"
              onClick={() => navigate('/register')}
              className="px-5 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Get Started
            </button>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 text-center">
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Learning
            <br />
            <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Journey Starts Here</span>
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of learners and educators on EduPlatform. Create courses, enroll in classes, and connect with a vibrant learning community.
          </p>
          <button
            data-testid="hero-get-started-btn"
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-lg rounded-xl font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all"
          >
            Start Learning Today
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-8 py-20">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything You Need to Succeed</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-effect rounded-2xl p-8 card-hover" data-testid="feature-courses">
            <div className="w-14 h-14 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-sky-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Rich Course Library</h4>
            <p className="text-gray-600">Access a wide variety of courses created by expert instructors across multiple disciplines.</p>
          </div>

          <div className="glass-effect rounded-2xl p-8 card-hover" data-testid="feature-lectures">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="w-7 h-7 text-blue-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Video Lectures</h4>
            <p className="text-gray-600">Watch high-quality video lectures at your own pace with interactive content.</p>
          </div>

          <div className="glass-effect rounded-2xl p-8 card-hover" data-testid="feature-chat">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-indigo-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Real-time Chat</h4>
            <p className="text-gray-600">Connect with instructors and fellow students through course discussions.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 py-16">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Begin?</h3>
          <p className="text-sky-100 mb-8 text-lg">Join our community of learners and educators today</p>
          <button
            data-testid="cta-register-btn"
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-white text-sky-600 rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-1 transition-all"
          >
            Create Free Account
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Landing;