import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import authHero from '../assets/auth-hero.png';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const isRegister = location.pathname.includes('register');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-stage relative min-h-screen w-screen flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-x-hidden select-none">
      <div className="auth-bg-grid" aria-hidden="true" />
      <div className="auth-bg-orb auth-bg-orb--tl" aria-hidden="true" />
      <div className="auth-bg-orb auth-bg-orb--br" aria-hidden="true" />
      <div className="auth-dash-line auth-dash-line--1" aria-hidden="true" />
      <div className="auth-dash-line auth-dash-line--2" aria-hidden="true" />

      <div className="auth-shell relative z-10 w-full max-w-[1040px] bg-white rounded-[32px] shadow-[0_32px_90px_-20px_rgba(0,0,0,0.45)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
        {/* Visual side — creative hero section */}
        <div
          className={`auth-visual relative order-1 lg:col-span-5 flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 ${
            isRegister ? 'min-h-[220px] sm:min-h-[260px]' : 'min-h-[260px] sm:min-h-[320px]'
          }`}
        >
          <div className="auth-curve" aria-hidden="true" />
          <div className="auth-curve-soft" aria-hidden="true" />

          {/* Top Brand Pill */}
          <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-[12px] font-semibold tracking-wide self-start shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Compliance Engine v2.5</span>
          </div>

          {/* Central Hero Image */}
          <div className="relative z-10 my-auto flex items-center justify-center py-4">
            <img
              src={authHero}
              alt="Abhyuday Compliance Platform"
              className={`auth-float w-full max-w-[360px] object-contain object-center select-none pointer-events-none drop-shadow-[0_20px_35px_rgba(0,0,0,0.25)] ${
                isRegister ? 'max-h-[200px] sm:max-h-[240px] lg:max-h-[280px]' : 'max-h-[240px] sm:max-h-[300px] lg:max-h-[340px]'
              }`}
              draggable={false}
            />
          </div>

          {/* Bottom Highlights */}
          <div className="relative z-10 hidden lg:flex flex-col gap-2 pt-2 border-t border-white/15">
            <div className="flex items-center gap-2 text-white/90 text-[12px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>Automated Stability & Personal Reminders</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
              <span>ISO 9001:2015 & Audit Trail Logging Active</span>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="order-2 lg:col-span-7 relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-10 sm:py-12 bg-white text-slate-900">
          <div className={`w-full mx-auto ${isRegister ? 'max-w-[420px]' : 'max-w-[380px]'}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
