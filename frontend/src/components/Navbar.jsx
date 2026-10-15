import React from 'react';
import { Sprout, LogIn, UserPlus, LogOut, ShieldCheck, Globe } from 'lucide-react';
import { authAPI } from '../api';

export default function Navbar({ currentPage, setCurrentPage, user, setUser, lang, setLang }) {
  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setCurrentPage('login');
  };

  const isTelugu = lang === 'Telugu';

  return (
    <header className="bg-emerald-900 text-white shadow-lg sticky top-0 z-50">
      {/* Top Govt of AP Advisory Ribbon */}
      <div className="bg-emerald-950 py-1 px-4 text-xs font-medium text-emerald-200 border-b border-emerald-800 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{isTelugu ? "ఆంధ్రప్రదేశ్ ప్రభుత్వం - వ్యవసాయ పరిశోధన & రైతు సాధికారత" : "Government of Andhra Pradesh - Rice Crop Advisory & Yield Intelligence"}</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setLang(isTelugu ? 'English' : 'Telugu')}
            className="flex items-center space-x-1 text-xs bg-emerald-800 hover:bg-emerald-700 px-2 py-0.5 rounded text-white transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isTelugu ? "English లోకి మార్చండి" : "తెలుగు (Telugu)"}</span>
          </button>
          <span className="hidden sm:inline text-emerald-300">Toll-Free Kisan Help: 155251</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div
          onClick={() => setCurrentPage(user ? 'dashboard' : 'login')}
          className="flex items-center space-x-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
            <Sprout className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              RicePulse <span className="text-amber-400 text-sm font-semibold px-1.5 py-0.5 bg-emerald-800 rounded">AP</span>
            </h1>
            <p className="text-xs text-emerald-200">
              {isTelugu ? "వరి పంట ఒత్తిడి గుర్తింపు & దిగుబడి అంచనా" : "AI Early Rice Stress & Yield Prediction"}
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  currentPage === 'dashboard'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {isTelugu ? "నా డాష్‌బోర్డు" : "Farmer Dashboard"}
              </button>
              <button
                onClick={() => setCurrentPage('datasets')}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  currentPage === 'datasets'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {isTelugu ? "డేటాసెట్‌లు" : "Datasets"}
              </button>
              <button
                onClick={() => setCurrentPage('admin')}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  currentPage === 'admin'
                    ? 'bg-amber-400 text-emerald-950 font-bold'
                    : 'text-amber-300 hover:bg-emerald-800'
                }`}
              >
                🛡️ {isTelugu ? "అడ్మిన్" : "Admin"}
              </button>
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-white leading-tight">{user.full_name}</span>
                <span className="text-xs text-emerald-300">{user.village}, {user.district}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isTelugu ? "లాగ్ అవుట్" : "Logout"}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage('datasets')}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  currentPage === 'datasets'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                {isTelugu ? "డేటాసెట్‌లు" : "Datasets"}
              </button>
              <button
                onClick={() => setCurrentPage('login')}
                className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-lg transition font-medium ${
                  currentPage === 'login'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>{isTelugu ? "లాగిన్" : "Login"}</span>
              </button>
              <button
                onClick={() => setCurrentPage('register')}
                className={`flex items-center space-x-1 text-sm px-3.5 py-1.5 rounded-lg font-semibold transition shadow ${
                  currentPage === 'register'
                    ? 'bg-amber-400 text-emerald-950 hover:bg-amber-300'
                    : 'bg-emerald-500 text-white hover:bg-emerald-400'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>{isTelugu ? "రైతు నమోదు" : "Farmer Register"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
