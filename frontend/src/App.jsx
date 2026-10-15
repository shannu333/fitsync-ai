import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import DatasetInfo from './pages/DatasetInfo';
import AdminDashboard from './pages/AdminDashboard';
import { authAPI } from './api';

export default function App() {
  const [user, setUser] = useState(authAPI.getCurrentUser());
  const [currentPage, setCurrentPage] = useState(authAPI.getToken() ? 'dashboard' : 'register');
  const [lang, setLang] = useState('Telugu'); // Default Telugu for AP Farmers
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sync hash routing e.g. #/login, #/register, #/dashboard, #/datasets, #/admin
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['login', 'register', 'dashboard', 'datasets', 'admin'].includes(hash)) {
        // If unauthenticated trying to view protected pages, route to login
        if ((hash === 'dashboard' || hash === 'admin') && !authAPI.getToken()) {
          setCurrentPage('login');
        } else {
          setCurrentPage(hash);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Update URL hash when currentPage changes
  useEffect(() => {
    window.location.hash = `/${currentPage}`;
  }, [currentPage]);

  // Check auth and fetch profile on app start
  useEffect(() => {
    const initAuth = async () => {
      const token = authAPI.getToken();
      if (token) {
        try {
          const profile = await authAPI.getProfile();
          setUser(profile);
          if (profile.preferred_language) {
            setLang(profile.preferred_language);
          }
          setCurrentPage('dashboard');
        } catch (err) {
          console.warn("Session expired or invalid:", err);
          authAPI.logout();
          setUser(null);
          setCurrentPage('login');
        }
      } else {
        setUser(null);
      }
      setCheckingAuth(false);
    };

    initAuth();

    const handleAuthEvent = () => {
      const current = authAPI.getCurrentUser();
      setUser(current);
      if (!current) {
        setCurrentPage('login');
      }
    };

    window.addEventListener('auth-changed', handleAuthEvent);
    return () => window.removeEventListener('auth-changed', handleAuthEvent);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.preferred_language) {
      setLang(userData.preferred_language);
    }
    setCurrentPage('dashboard');
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    if (userData.preferred_language) {
      setLang(userData.preferred_language);
    }
    setCurrentPage('dashboard');
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-emerald-800">
            వరి సంరక్షణ వేదిక లోడ్ అవుతోంది... (Loading RicePulse AP)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        setUser={setUser}
        lang={lang}
        setLang={setLang}
      />

      <main className="flex-1 pb-16">
        {currentPage === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setCurrentPage('register')}
            lang={lang}
          />
        )}

        {currentPage === 'register' && (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setCurrentPage('login')}
            lang={lang}
          />
        )}

        {currentPage === 'dashboard' && user && (
          <Dashboard
            user={user}
            onProfileUpdated={handleProfileUpdated}
            lang={lang}
          />
        )}

        {currentPage === 'datasets' && (
          <DatasetInfo
            lang={lang}
            onBack={() => setCurrentPage(user ? 'dashboard' : 'login')}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard
            lang={lang}
            onBackToFarmerDashboard={() => setCurrentPage('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-300 py-6 border-t border-emerald-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-white">
              RicePulse AP - AI-Based Early Crop Stress Detection and Yield Prediction System
            </p>
            <p className="text-emerald-400 text-[11px] mt-0.5">
              Dedicated to the Rice Cultivators of Andhra Pradesh (Godavari, Krishna & Southern Agro-Zones)
            </p>
          </div>
          <div className="flex items-center gap-4 text-emerald-400">
            <span>Stage 8: Admin & Production Ready</span>
            <span>•</span>
            <span>FastAPI + React Vite + APScheduler</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
