import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            company: null,
            isAuthenticated: false,

            login: async (email, password) => {
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { user, company, token } = response.data.data;
                    
                    set({
                        user,
                        company,
                        token,
                        isAuthenticated: true
                    });
                    
                    localStorage.setItem('token', token);
                    return { success: true };
                } catch (error) {
                    return { success: false, message: error.response?.data?.message || 'Login failed' };
                }
            },

            register: async (userData) => {
                try {
                    const response = await api.post('/auth/register', userData);
                    const { user, company, token } = response.data.data;
                    
                    set({
                        user,
                        company,
                        token,
                        isAuthenticated: true
                    });
                    
                    localStorage.setItem('token', token);
                    return { success: true };
                } catch (error) {
                    return { success: false, message: error.response?.data?.message || 'Registration failed' };
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    company: null,
                    isAuthenticated: false
                });
                localStorage.removeItem('token');
            },

            loadProfile: async () => {
                try {
                    const response = await api.get('/auth/profile');
                    set({
                        user: response.data.data,
                        isAuthenticated: true
                    });
                } catch (error) {
                    get().logout();
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                company: state.company,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);

export default useAuthStore;

