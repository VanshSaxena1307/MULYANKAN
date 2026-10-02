import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/base/Modal';
import { Button } from '../components/base/Button';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Info,
  Users,
  ClipboardList,
  BarChart3,
  Calendar,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your Username / User ID');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    login(username.trim());
    navigate('/teacher');
  };

  const featureCards = [
    {
      id: 'teams',
      title: 'Manage Teams',
      description: 'View and track project teams',
      icon: Users,
    },
    {
      id: 'evaluate',
      title: 'Evaluate Projects',
      description: 'Enter and manage evaluation marks',
      icon: ClipboardList,
    },
    {
      id: 'progress',
      title: 'Track Progress',
      description: 'Monitor student and team performance',
      icon: BarChart3,
    },
    {
      id: 'attendance',
      title: 'Manage Attendance',
      description: 'Mark and track evaluation attendance',
      icon: Calendar,
    },
  ];

  return (
    <div className="relative h-screen h-[100dvh] max-h-[100dvh] w-full overflow-hidden font-sans select-none flex flex-col justify-between">
      {/* 1. SHARP FULL-SCREEN ABES CAMPUS BACKGROUND (No blur, no heavy filter) */}
      <img
        src="/images/abes-building.jpeg"
        alt="ABES Engineering College Campus"
        className="fixed inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
        style={{ filter: 'none', opacity: 1 }}
      />

      {/* Subtle atmospheric light vignette for text contrast on far-left, keeping campus center 100% sharp */}
      <div
        className="fixed inset-0 z-0 bg-gradient-to-r from-white/35 via-white/10 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. TOP HEADER NAVIGATION */}
      <header className="relative z-10 w-full shrink-0 px-6 sm:px-10 lg:px-14 pt-4 sm:pt-6 pb-2 flex items-center justify-between">
        {/* Top-Left: Official ABES Logo Asset */}
        <div className="flex items-center">
          <img
            src="/images/logo.avif"
            alt="ABES Engineering College"
            className="h-11 sm:h-12 w-auto object-contain drop-shadow-sm"
          />
        </div>

        {/* Top-Right: Project Evaluation Portal | v1.0 */}
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700/90 tracking-wide bg-white/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/70 shadow-xs">
          <span>Project Evaluation Portal</span>
          <span className="text-slate-400">|</span>
          <span className="font-semibold text-slate-800">v1.0</span>
        </div>
      </header>

      {/* 3. MAIN HERO & FLOATING LOGIN PANEL (Viewport-safe, fits without vertical scroll) */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10 my-auto">
        
        {/* LEFT COLUMN: HERO INSTITUTIONAL CONTENT & FEATURE CARDS */}
        <div className="hidden lg:flex flex-col justify-center space-y-3.5 xl:space-y-4 max-w-lg shrink-0">
          {/* Eyebrow */}
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">
            FACULTY PORTAL
          </div>

          {/* Large Hero Heading */}
          <h1 className="text-4xl xl:text-[50px] font-black tracking-tight text-[#0F172A] leading-[1.06]">
            <div>Evaluate.</div>
            <div>Guide.</div>
            <div className="text-[#2563EB]">Build Better.</div>
          </h1>

          {/* Description */}
          <p className="text-xs xl:text-sm text-slate-700 leading-relaxed max-w-md font-normal">
            A unified platform for project evaluation,<br />
            academic mentoring and student progress<br />
            at ABES Engineering College, Ghaziabad.
          </p>

          {/* Four Horizontally Structured Frosted Glass Feature Cards */}
          <div className="space-y-2.5 pt-1 max-w-md">
            {featureCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.id}
                  className="group flex items-center justify-between py-2 sm:py-2.5 px-3.5 rounded-2xl bg-white/75 hover:bg-white/90 border border-white/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all duration-200 cursor-default"
                >
                  <div className="flex items-center gap-3">
                    {/* Small Circular Icon Container */}
                    <div className="h-9 w-9 rounded-full bg-blue-50/90 border border-blue-100/80 flex items-center justify-center text-[#2563EB] shadow-xs group-hover:bg-[#2563EB] group-hover:text-white transition-colors shrink-0">
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Text Details */}
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] leading-tight">
                        {card.title}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  {/* Right-facing arrow */}
                  <div className="pr-1 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: FLOATING FROSTED GLASS LOGIN CARD */}
        <div className="w-full max-w-[390px] xl:max-w-[415px] shrink-0 my-auto">
          <div className="rounded-[28px] sm:rounded-[30px] bg-white/80 backdrop-blur-xl border border-white/95 p-5 sm:p-6 xl:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition-all">
            
            {/* Top of Card: Official ABES Logo Asset */}
            <div className="flex justify-center mb-2.5">
              <img
                src="/images/logo.avif"
                alt="ABES Logo"
                className="h-11 sm:h-12 w-auto object-contain drop-shadow-sm"
              />
            </div>

            {/* Welcome Back & Subtitle */}
            <div className="text-center space-y-0.5 mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Sign in to your faculty account
              </p>
            </div>

            {/* Validation Message */}
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50/90 p-2 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Single Teacher Authentication Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              {/* Username Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#0F172A]">
                  Username
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. firstname@abes"
                    autoComplete="username"
                    className="flex h-9 sm:h-10 w-full rounded-xl border border-slate-200/90 bg-white/90 pl-9 pr-3.5 py-1.5 text-xs sm:text-sm text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#0F172A]">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="flex h-9 sm:h-10 w-full rounded-xl border border-slate-200/90 bg-white/90 pl-9 pr-10 py-1.5 text-xs sm:text-sm text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#0F172A] font-medium text-[11px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30 transition-all accent-[#2563EB]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="font-medium text-[#2563EB] hover:text-blue-700 transition-colors text-[11px]"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Login Button with Blue Gradient */}
              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#0284C7] hover:from-[#1D4ED8] hover:to-[#0369A1] text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 active:translate-y-px transition-all flex items-center justify-center gap-1.5 mt-1"
              >
                <span>Login</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center pt-0.5 pb-0.5">
                <div className="w-full border-t border-slate-200/90" />
                <span className="absolute bg-white/90 px-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  OR
                </span>
              </div>

              {/* Faculty Info Callout Box */}
              <div className="rounded-xl bg-blue-50/80 border border-blue-100/90 p-2.5 flex items-start gap-2 text-[10.5px] leading-snug text-slate-600">
                <Info className="h-3.5 w-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  Use your official ABES faculty credentials.
                  For any login issues, contact the Academic Office.
                </div>
              </div>

              {/* Subtle Secondary Admin Login */}
              <div className="pt-1 text-center space-y-0.5">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#2563EB] transition-colors py-0.5 px-2 rounded-lg hover:bg-white/60"
                >
                  <Shield className="h-3 w-3" />
                  <span>Admin Login</span>
                </button>
                <p className="text-[10px] text-slate-400">
                  Single teacher login for Guide & Evaluator workflows.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM INSTITUTIONAL FOOTER */}
      <footer className="relative z-10 w-full shrink-0 px-6 sm:px-10 lg:px-14 pb-3 pt-1 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-700/80 gap-1.5">
        <div className="flex items-center gap-2.5 text-[11px] font-medium">
          <span>Academic Excellence</span>
          <span className="text-slate-400">|</span>
          <span>Innovation</span>
          <span className="text-slate-400">|</span>
          <span>Holistic Development</span>
        </div>
        <div className="text-[10.5px] text-slate-500">
          MULYANKAN • Institutional Academic Platform
        </div>
      </footer>

      {/* Modal for Forgot Password guidance */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Password Assistance"
        maxWidth="sm"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsForgotModalOpen(false)}>
            Understood
          </Button>
        }
      >
        <div className="space-y-2.5 py-1 text-xs text-slate-600 leading-relaxed">
          <p>
            Faculty account passwords and initial temporary keys are provisioned by the college administrative system.
          </p>
          <p>
            If you have forgotten your password or cannot access your institutional credentials, please reach out to the <strong>Academic Project Office</strong> or system administrator for assistance.
          </p>
        </div>
      </Modal>

      {/* Modal for Admin Login notice */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Admin Portal Access"
        maxWidth="sm"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsAdminModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            Administrative access is restricted to designated college evaluation coordinators. The administrative authentication module will be connected during backend institutional integration.
          </p>
        </div>
      </Modal>
    </div>
  );
};
