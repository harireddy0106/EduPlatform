//admin/src/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('adminToken'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            // Assuming GET /api/auth/me returns user details
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/auth/me`);
            if (response.data.role !== 'admin') {
                logout();
                alert('Access denied. Admin only.');
                return;
            }
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login`, {
            email,
            password,
        });

        if (response.data.user.role !== 'admin') {
            throw new Error('Access denied. Admin only.');
        }

        const { token } = response.data; // token is returned as 'token' in authRoutes.js

        setToken(token);
        setUser(response.data.user);
        localStorage.setItem('adminToken', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('adminToken');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
