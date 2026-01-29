

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    Flag,
    Settings,
    Shield
} from 'lucide-react';

const AdminSidebar = () => {
    const [stats, setStats] = useState({ students: 0, instructors: 0, courses: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const startUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
                if (token) {
                    const response = await axios.get(`${startUrl}/api/admin/reports/stats`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data.success) {
                        setStats({
                            students: response.data.stats.totalStudents || 0,
                            instructors: response.data.stats.totalInstructors || 0,
                            courses: response.data.stats.totalCourses || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch sidebar stats", error);
            }
        };
        fetchStats();
    }, []);

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
        { icon: Users, label: 'Students', path: '/students', count: stats.students },
        { icon: GraduationCap, label: 'Instructors', path: '/instructors', count: stats.instructors },
        { icon: BookOpen, label: 'Courses', path: '/courses', count: stats.courses },
        { icon: Flag, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
            <div className="flex items-center justify-center h-16 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Shield className="w-8 h-8 text-blue-500" />
                    <h1 className="text-xl font-bold text-white tracking-wider uppercase">Admin</h1>
                </div>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto">
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.count !== undefined && item.count !== null && (
                                <span className="bg-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded-full">
                                    {item.count}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-center text-slate-500">
                    v1.0.0 Admin Portal
                </div>
            </div>
        </div>
    );
};

export default AdminSidebar;
