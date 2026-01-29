import React from 'react';

// This component simulates a course card using Tailwind CSS utilities
const CourseCard = ({ title, instructor, lectures, progress }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden max-w-sm w-full border border-gray-100">
      
      {/* Thumbnail Placeholder */}
      <div className="h-32 bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
        {title}
      </div>

      {/* Card Content */}
      <div className="p-5">
        
        {/* Title and Instructor */}
        <h3 className="text-xl font-bold text-gray-900 mb-1 leading-snug">
          {title}
        </h3>
        <p className="text-sm font-medium text-indigo-600 mb-4">
          By {instructor}
        </p>

        {/* Course Stats */}
        <div className="flex justify-between items-center text-sm text-gray-600 mb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center space-x-1">
            {/* Icon for Lectures */}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.206 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.523 5.794 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.794 5 16.5 5s3.332.477 4.5 1.247v13C19.832 18.523 18.206 18 16.5 18s-3.332.477-4.5 1.247"></path></svg>
            <span>{lectures} Lectures</span>
          </div>
          
          {/* Progress Badge */}
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
            {progress}% Complete
          </span>
        </div>

        {/* Action Button */}
        <button
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
        >
          Continue Course
        </button>
      </div>
    </div>
  );
};

// Example usage of the component:
export default function DashboardView() {
    const courseData = [
        { id: 1, title: "Advanced MERN Stack Security", instructor: "Alex Johnson", lectures: 15, progress: 85 },
        { id: 2, title: "PostgreSQL & Prisma Deep Dive", instructor: "Sarah Lee", lectures: 22, progress: 30 }
    ];

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6">My Enrolled Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {courseData.map(course => (
                    <CourseCard key={course.id} {...course} />
                ))}
            </div>
        </div>
    )
}
