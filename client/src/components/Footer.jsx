import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="w-full bg-white border-t border-gray-100 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between">
                    {/* Logo Section */}
                    <div className="flex items-center space-x-3 mb-6 md:mb-0">
                        <div className="w-8 h-8 bg-[#1B84FF] rounded-lg flex items-center justify-center shadow-sm">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-gray-900 leading-tight">EduPlatform</span>
                            <span className="text-xs text-gray-500 mt-0.5">Learn. Grow. Succeed.</span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-8">
                        <Link to="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            About
                        </Link>
                        <Link to="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Contact
                        </Link>
                        <Link to="/privacy" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Privacy
                        </Link>
                        <Link to="/terms" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Terms
                        </Link>
                    </div>
                </div>

                {/* Divider and Copyright */}
                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} EduPlatform. Empowering learners worldwide. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
