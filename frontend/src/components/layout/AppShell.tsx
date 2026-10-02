import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../role/RoleBadge';
import { Button } from '../base/Button';
import {
  GraduationCap,
  ArrowLeftRight,
  ShieldCheck,
  User,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { activeRole, requestRoleSwitch, currentUser } = useAuth();
  const location = useLocation();

  const otherRole = activeRole === 'Guide' ? 'Evaluator' : 'Guide';

  return (
    <div className="min-h-screen flex flex-col bg-arctic-bg text-arctic-text-main">
      {/* Top Arctic Glass Header */}
      <header className="arctic-glass-header sticky top-0 z-40 w-full transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Platform Identity */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-arctic-primary to-blue-700 flex items-center justify-center text-white shadow-md shadow-arctic-primary/25 border border-white/40">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-arctic-text-main group-hover:text-arctic-primary transition-colors">
                  MULYANKAN
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 border border-blue-200/60">
                  Institutional
                </span>
              </div>
              <p className="text-[11px] font-medium text-arctic-text-muted leading-none">
                Academic Project Evaluation Platform
              </p>
            </div>
          </Link>

          {/* Navigation / Role Control Area */}
          <div className="flex items-center gap-3 sm:gap-4">
            {currentUser && (
              <>
                {/* Active Teacher Role with Switch Action */}
                <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-arctic-border px-3 py-1.5 shadow-arctic-sm">
                  <span className="text-xs font-medium text-arctic-text-muted hidden md:inline">
                    Current Role:
                  </span>
                  <RoleBadge role={activeRole} size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-arctic-text-secondary hover:text-arctic-primary hover:bg-blue-50/80 gap-1 rounded-md"
                    onClick={() => requestRoleSwitch(otherRole)}
                    title={`Switch role to ${otherRole}`}
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span className="hidden sm:inline">Switch to {otherRole}</span>
                  </Button>
                </div>

                {/* Faculty User Identifier */}
                <div className="flex items-center gap-2 pl-2 border-l border-arctic-border">
                  <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-arctic-text-secondary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-semibold text-arctic-text-main leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-arctic-text-muted font-mono leading-none">
                      {currentUser.username}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sub-navigation bar for Quick Context */}
      <nav className="bg-white/60 border-b border-arctic-border/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-arctic-text-secondary">
            <Layers className="h-3.5 w-3.5 text-arctic-primary" />
            <span className="font-medium text-arctic-text-main">Session:</span>
            <span>Academic Evaluation Cycle</span>
            <span className="text-slate-300">•</span>
            <span className="text-arctic-text-muted">Target Cohorts: 2nd Year & 3rd Year</span>
          </div>

          <div className="flex items-center gap-4 text-arctic-text-secondary">
            <Link
              to="/teacher"
              className={`hover:text-arctic-primary transition-colors ${
                location.pathname.startsWith('/teacher') ? 'font-semibold text-arctic-primary' : ''
              }`}
            >
              Academic Cohorts
            </Link>
            <Link
              to="/login"
              className={`hover:text-arctic-primary transition-colors ${
                location.pathname === '/login' ? 'font-semibold text-arctic-primary' : ''
              }`}
            >
              Faculty Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Institutional Arctic Glass Footer */}
      <footer className="border-t border-arctic-border bg-white/70 backdrop-blur-md py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-arctic-text-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-arctic-primary" />
            <span>
              <strong>MULYANKAN</strong> — Academic Project Evaluation Platform (Institutional Build)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Data Source: Official Institutional Excel Ledger</span>
            <span>•</span>
            <span className="text-slate-500">Roll No. Identity Preserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
