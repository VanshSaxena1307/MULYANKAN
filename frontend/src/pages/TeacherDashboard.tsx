import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/base/Card';
import { Button } from '../components/base/Button';
import { Badge } from '../components/base/Badge';
import { RoleBadge } from '../components/role/RoleBadge';
import { useAuth } from '../context/AuthContext';
import {
  TeacherRole,
  TeacherDashboardResponse,
  TeacherProjectSummary,
  ProjectMemberSummary,
  EVALUATION_LIFECYCLE_STAGES,
  EvaluationLifecycleStage,
} from '@mulyankan/shared';
import {
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Users,
  Calendar,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Shield,
  Star,
  Layers,
  FileCheck,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { activeRole, requestRoleSwitch, switchRole, token, handleUnauthorized, setAvailableRoles, availableRoles } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<TeacherDashboardResponse | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<'AUTO' | 'Guide' | 'Evaluator' | 'ALL'>('AUTO');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Fetch Dashboard Data from Backend API
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/teacher/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized('Your session has expired. Please sign in again.');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch teacher dashboard data (HTTP ${res.status})`);
      }

      const data: TeacherDashboardResponse = await res.json();
      setDashboardData(data);

      // Synchronize available roles into AuthContext
      if (data.availableRoles && data.availableRoles.length > 0) {
        setAvailableRoles(data.availableRoles);
      }
    } catch (err: any) {
      console.error('Teacher dashboard fetch error:', err);
      setError(err.message || 'Unable to connect to the evaluation server.');
    } finally {
      setLoading(false);
    }
  }, [token, handleUnauthorized, setAvailableRoles]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Determine effective role filter (by default matches the active operational role from AuthContext)
  const currentRoleScope: 'Guide' | 'Evaluator' | 'ALL' =
    roleFilter === 'AUTO' ? activeRole : roleFilter;

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!dashboardData) return [];

    let list = dashboardData.projects;

    // 1. Role filter
    if (currentRoleScope === 'Guide') {
      list = list.filter((p) => p.isGuide);
    } else if (currentRoleScope === 'Evaluator') {
      list = list.filter((p) => p.isEvaluator || p.isDprcMember1 || p.isDprcMember2);
    }

    // 2. Cohort filter
    if (selectedCohortId !== 'ALL') {
      list = list.filter((p) => p.academicYearId === selectedCohortId);
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const matchesProject =
          p.projectId.toLowerCase().includes(q) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.technology && p.technology.toLowerCase().includes(q)) ||
          (p.domain && p.domain.toLowerCase().includes(q));

        const matchesStudent = p.members.some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.rollNumber.toLowerCase().includes(q)
        );

        return matchesProject || matchesStudent;
      });
    }

    return list;
  }, [dashboardData, currentRoleScope, selectedCohortId, searchQuery]);

  const toggleExpand = (projectId: string) => {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
  };

  const otherRole: TeacherRole = activeRole === 'Guide' ? 'Evaluator' : 'Guide';
  const hasMultipleRoles = availableRoles.length > 1;

  return (
    <div className="space-y-8 py-2">
      {/* 1. TOP FACULTY WORKSPACE HEADER */}
      <div className="rounded-2xl border border-arctic-border bg-white/90 p-6 sm:p-8 shadow-arctic-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-arctic-text-muted uppercase tracking-wider">
              Faculty Workspace
            </span>
            <RoleBadge role={activeRole} size="sm" />
            <Badge variant="cyan" size="sm">
              Live Supabase DB
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-arctic-text-main tracking-tight">
            Academic Project Evaluations
          </h1>
          <p className="text-xs sm:text-sm text-arctic-text-secondary max-w-2xl leading-relaxed">
            Welcome, <strong className="text-arctic-text-main">{dashboardData?.teacher.name || 'Faculty Member'}</strong>.
            Operating as <strong className="text-arctic-primary">{activeRole}</strong>.
            Showing projects where you are assigned as Guide, Evaluator, or DPRC Member.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {hasMultipleRoles && (
            <Button
              variant="outline"
              size="md"
              onClick={() => requestRoleSwitch(otherRole)}
              leftIcon={<ArrowLeftRight className="h-4 w-4 text-arctic-primary" />}
            >
              Switch to {otherRole}
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            onClick={fetchDashboardData}
            title="Refresh data"
            className="border border-arctic-border hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 text-arctic-text-secondary ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      {dashboardData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-xl border border-arctic-border bg-white/80 p-5 shadow-arctic-sm space-y-1">
            <div className="flex items-center justify-between text-arctic-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Projects</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-arctic-primary flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-arctic-text-main">
              {dashboardData.stats.totalProjects}
            </div>
            <p className="text-[11px] text-arctic-text-muted">Assigned across all panels</p>
          </div>

          <div
            onClick={() => {
              if (activeRole !== 'Guide') switchRole('Guide');
              setRoleFilter('Guide');
            }}
            className="rounded-xl border border-arctic-border bg-white/80 p-5 shadow-arctic-sm space-y-1 cursor-pointer hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between text-arctic-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Guided Teams
              </span>
              <div className="h-7 w-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-700">
              {dashboardData.stats.guidedCount}
            </div>
            <p className="text-[11px] text-arctic-text-muted">Designated Project Guide</p>
          </div>

          <div
            onClick={() => {
              if (activeRole !== 'Evaluator') switchRole('Evaluator');
              setRoleFilter('Evaluator');
            }}
            className="rounded-xl border border-arctic-border bg-white/80 p-5 shadow-arctic-sm space-y-1 cursor-pointer hover:border-cyan-300 transition-all"
          >
            <div className="flex items-center justify-between text-arctic-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-800">
                Evaluation Panels
              </span>
              <div className="h-7 w-7 rounded-lg bg-cyan-100/70 text-cyan-700 flex items-center justify-center">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-800">
              {dashboardData.stats.evaluatedCount}
            </div>
            <p className="text-[11px] text-arctic-text-muted">Evaluator / DPRC Member</p>
          </div>

          <div className="rounded-xl border border-arctic-border bg-white/80 p-5 shadow-arctic-sm space-y-1">
            <div className="flex items-center justify-between text-arctic-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Students</span>
              <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-arctic-text-main">
              {dashboardData.stats.totalStudents}
            </div>
            <p className="text-[11px] text-arctic-text-muted">Directly under your mentorship/review</p>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC ROLE RESPONSIBILITY HIGHLIGHT BANNER */}
      {currentRoleScope === 'Guide' ? (
        <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-white p-6 shadow-arctic-sm space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-blue-950">
                    Guide Operational Scope & Mentorship Responsibilities
                  </h3>
                  <Badge variant="primary" size="sm">
                    Active Mode
                  </Badge>
                </div>
                <p className="text-xs text-blue-900/80 mt-0.5">
                  As Project Guide, you oversee day-to-day team progression, technical architecture, and attendance validation.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="rounded-xl bg-white/90 border border-blue-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                Team Mentorship
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Supervise implementation, code repositories, and work allocation across team members.
              </p>
            </div>

            <div className="rounded-xl bg-white/90 border border-blue-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                Team Leader Oversight
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Coordinate with the designated Team Leader (Member #1) for milestone submissions.
              </p>
            </div>

            <div className="rounded-xl bg-white/90 border border-blue-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                Attendance Verification
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Ensure students are present and active during all institutional review sessions.
              </p>
            </div>

            <div className="rounded-xl bg-white/90 border border-blue-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                Pre-Evaluation Clearance
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Review literature survey and methodology reports before formal evaluator evaluation.
              </p>
            </div>
          </div>
        </div>
      ) : currentRoleScope === 'Evaluator' ? (
        <div className="rounded-2xl border border-cyan-200/90 bg-gradient-to-r from-cyan-50/90 via-teal-50/60 to-white p-6 shadow-arctic-sm space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-cyan-950">
                    Evaluator & DPRC Panel Responsibilities
                  </h3>
                  <Badge variant="cyan" size="sm">
                    Active Mode
                  </Badge>
                </div>
                <p className="text-xs text-cyan-950/80 mt-0.5">
                  You are evaluating projects based on standardized rubrics (100 Marks Grand Total). Marks are student-specific.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="rounded-xl bg-white/90 border border-cyan-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-cyan-950 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-800">
                  P1
                </span>
                Presentation-1 (6 Marks)
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                DPRC Member Review: Novelty (5M) & Technical Feasibility (5M), scaled to 6M.
              </p>
            </div>

            <div className="rounded-xl bg-white/90 border border-cyan-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-cyan-950 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-800">
                  P2
                </span>
                Presentation-2 (24 Marks)
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Evaluator Review: Literature Gap (6M), Methodology (6M), Ethics (6M), Work Plan (6M).
              </p>
            </div>

            <div className="rounded-xl bg-white/90 border border-cyan-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-cyan-950 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-800">
                  E2
                </span>
                Evaluation-2 (30 Marks)
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Mid-Term Functional Review: Implementation (6M), Troubleshooting (6M), Ethics (6M), Reporting (6M).
              </p>
            </div>

            <div className="rounded-xl bg-white/90 border border-cyan-100 p-3 space-y-1 shadow-2xs">
              <div className="font-semibold text-cyan-950 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-800">
                  E3
                </span>
                Evaluation-3 (40 Marks)
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Final Viva & Testing: Quality (8M), Testing (8M), Report (8M), Impact (8M), Viva (8M).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-arctic-sm text-xs text-slate-600 flex items-center gap-3">
          <Layers className="h-5 w-5 text-arctic-primary" />
          <span>Showing combined portfolio of all projects assigned to you across Guide and Evaluator panels.</span>
        </div>
      )}

      {/* 4. FILTERING & SEARCH TOOLBAR */}
      <div className="rounded-xl border border-arctic-border bg-white/90 p-4 shadow-arctic-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Role Scope Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              if (activeRole !== 'Guide') switchRole('Guide');
              setRoleFilter('Guide');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentRoleScope === 'Guide'
                ? 'bg-white text-arctic-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Guide ({dashboardData?.stats.guidedCount ?? 0})</span>
          </button>

          <button
            onClick={() => {
              if (activeRole !== 'Evaluator') switchRole('Evaluator');
              setRoleFilter('Evaluator');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentRoleScope === 'Evaluator'
                ? 'bg-white text-cyan-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Evaluator ({dashboardData?.stats.evaluatedCount ?? 0})</span>
          </button>

          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentRoleScope === 'ALL'
                ? 'bg-white text-arctic-text-main shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All ({dashboardData?.stats.totalProjects ?? 0})</span>
          </button>
        </div>

        {/* Cohort Select & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {dashboardData && dashboardData.cohorts.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-4 w-4 text-arctic-text-muted hidden sm:inline" />
              <select
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                className="h-9 rounded-xl border border-arctic-border bg-white px-3 py-1 text-xs text-arctic-text-main focus:border-arctic-primary focus:outline-none focus:ring-2 focus:ring-arctic-primary/20"
              >
                <option value="ALL">All Cohorts</option>
                {dashboardData.cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} ({cohort.academicSession})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Project ID, title, roll no..."
              className="h-9 w-full rounded-xl border border-arctic-border bg-white pl-9 pr-3 text-xs text-arctic-text-main placeholder:text-slate-400 focus:border-arctic-primary focus:outline-none focus:ring-2 focus:ring-arctic-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. ERROR STATE */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-5 text-rose-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Error Loading Projects</h4>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} className="border-rose-300 hover:bg-rose-100">
            Retry
          </Button>
        </div>
      )}

      {/* 6. LOADING STATE */}
      {loading && !dashboardData && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-arctic-text-muted flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-arctic-primary" />
            Loading assigned projects from Supabase database...
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-arctic-border bg-white p-6 shadow-arctic-sm animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 w-24 bg-slate-200 rounded-md" />
                  <div className="h-6 w-32 bg-slate-200 rounded-md" />
                </div>
                <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
                <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
                <div className="pt-4 border-t border-slate-100 flex gap-4">
                  <div className="h-4 w-20 bg-slate-200 rounded-md" />
                  <div className="h-4 w-20 bg-slate-200 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. EMPTY STATE */}
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-arctic-border bg-white/70 p-12 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-arctic-text-main">
              No Projects Found
            </h3>
            <p className="text-xs text-arctic-text-secondary leading-relaxed">
              {searchQuery
                ? `No projects matched "${searchQuery}". Try a different project ID, student name, or roll number.`
                : currentRoleScope === 'Guide'
                ? 'You do not have any projects assigned as Guide in this cohort.'
                : currentRoleScope === 'Evaluator'
                ? 'You do not have any projects assigned as Evaluator or DPRC Member in this cohort.'
                : 'No projects found in the selected cohort.'}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRoleFilter('ALL');
                setSelectedCohortId('ALL');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* 8. REAL PROJECTS LIST */}
      {!loading && filteredProjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-arctic-text-secondary px-1">
            <span>
              Showing <strong className="text-arctic-text-main">{filteredProjects.length}</strong> project{filteredProjects.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-arctic-text-muted">
              Click a team to expand details and individual student marks
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredProjects.map((project: TeacherProjectSummary) => {
              const isExpanded = expandedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'border-arctic-primary ring-2 ring-arctic-primary/10 bg-white shadow-arctic-card'
                      : 'border-arctic-border bg-white/90 hover:border-slate-300 shadow-arctic-sm'
                  }`}
                >
                  {/* Project Card Header Area */}
                  <div
                    onClick={() => toggleExpand(project.id)}
                    className="p-6 cursor-pointer select-none space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Project ID Badge */}
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-xs">
                          {project.projectId}
                        </span>

                        {/* Technology Pill */}
                        {project.technology && (
                          <Badge variant="primary" size="sm">
                            {project.technology}
                          </Badge>
                        )}

                        {/* Domain Pill */}
                        {project.domain && (
                          <Badge variant="default" size="sm" className="hidden sm:inline-flex">
                            {project.domain}
                          </Badge>
                        )}

                        {/* Academic Cohort Pill */}
                        {project.academicYearName && (
                          <span className="text-[11px] font-medium text-slate-500">
                            • {project.academicYearName}
                          </span>
                        )}
                      </div>

                      {/* Faculty Relationships on this Project */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {project.isGuide && (
                          <Badge variant="primary" size="sm" className="font-semibold gap-1">
                            <BookOpen className="h-3 w-3 text-blue-600" />
                            Guide
                          </Badge>
                        )}
                        {project.isEvaluator && (
                          <Badge variant="cyan" size="sm" className="font-semibold gap-1">
                            <Award className="h-3 w-3 text-cyan-700" />
                            Evaluator
                          </Badge>
                        )}
                        {project.isDprcMember1 && (
                          <Badge variant="warning" size="sm" className="font-semibold text-[10px]">
                            DPRC Member 1
                          </Badge>
                        )}
                        {project.isDprcMember2 && (
                          <Badge variant="warning" size="sm" className="font-semibold text-[10px]">
                            DPRC Member 2
                          </Badge>
                        )}

                        <div className="text-slate-400 pl-1">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-arctic-text-main leading-snug">
                        {project.title || 'Untitled Academic Project'}
                      </h3>
                    </div>

                    {/* Quick Info Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-arctic-text-secondary border-t border-slate-100">
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Students count */}
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-arctic-text-muted" />
                          <strong>{project.members.length}</strong> Students
                        </span>

                        {/* Guide Name */}
                        {project.guideTeacher && (
                          <span className="text-[11px]">
                            <span className="text-arctic-text-muted">Guide: </span>
                            <span className="font-semibold text-arctic-text-main">
                              {project.guideTeacher.name}
                            </span>
                          </span>
                        )}

                        {/* Evaluator Name */}
                        {project.evaluatorTeacher && (
                          <span className="text-[11px]">
                            <span className="text-arctic-text-muted">Evaluator: </span>
                            <span className="font-semibold text-arctic-text-main">
                              {project.evaluatorTeacher.name}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Evaluation Stages Progress Chips */}
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                        {['PRESENTATION_1', 'PRESENTATION_2', 'EVALUATION_2', 'EVALUATION_3'].map(
                          (stageKey) => {
                            const status = project.evaluationStatus.stages[stageKey];
                            const label =
                              stageKey === 'PRESENTATION_1'
                                ? 'P1'
                                : stageKey === 'PRESENTATION_2'
                                ? 'P2'
                                : stageKey === 'EVALUATION_2'
                                ? 'E2'
                                : 'E3';

                            if (status?.isCompleted) {
                              return (
                                <span
                                  key={stageKey}
                                  title={`${label}: Completed (${status.markedCount}/${status.totalMembers} marked)`}
                                  className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5"
                                >
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                  {label}
                                </span>
                              );
                            }

                            if (status && status.markedCount > 0) {
                              return (
                                <span
                                  key={stageKey}
                                  title={`${label}: In Progress (${status.markedCount}/${status.totalMembers})`}
                                  className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                                >
                                  {label}
                                </span>
                              );
                            }

                            return (
                              <span
                                key={stageKey}
                                title={`${label}: Pending evaluation`}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400"
                              >
                                {label}
                              </span>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section: Full Student Roster & Evaluation Records */}
                  {isExpanded && (
                    <div className="border-t border-arctic-border bg-slate-50/60 p-6 rounded-b-2xl space-y-6">
                      {/* Project Panel Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="rounded-xl border border-arctic-border bg-white p-3 space-y-0.5">
                          <span className="text-[10px] font-bold uppercase text-arctic-text-muted tracking-wider">
                            Designated Guide
                          </span>
                          <div className="font-semibold text-arctic-text-main">
                            {project.guideTeacher?.name || 'Not Assigned'}
                          </div>
                          <div className="text-[11px] text-arctic-text-muted font-mono">
                            {project.guideTeacher?.userId}
                          </div>
                        </div>

                        <div className="rounded-xl border border-arctic-border bg-white p-3 space-y-0.5">
                          <span className="text-[10px] font-bold uppercase text-arctic-text-muted tracking-wider">
                            Evaluator Faculty
                          </span>
                          <div className="font-semibold text-arctic-text-main">
                            {project.evaluatorTeacher?.name || 'Not Assigned'}
                          </div>
                          <div className="text-[11px] text-arctic-text-muted font-mono">
                            {project.evaluatorTeacher?.userId}
                          </div>
                        </div>

                        <div className="rounded-xl border border-arctic-border bg-white p-3 space-y-0.5">
                          <span className="text-[10px] font-bold uppercase text-arctic-text-muted tracking-wider">
                            DPRC Review Panel
                          </span>
                          <div className="text-[11px] text-arctic-text-main">
                            1: {project.dprcMember1?.name || 'N/A'}
                          </div>
                          <div className="text-[11px] text-arctic-text-main">
                            2: {project.dprcMember2?.name || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Student Team Members Table */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-arctic-text-main uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-arctic-primary" />
                            Team Members & Individual Evaluation Ledger
                          </h4>
                          <span className="text-[11px] text-arctic-text-muted">
                            Member #1 is the official designated Team Leader
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-arctic-border bg-white shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-arctic-border bg-slate-50/80 text-[11px] text-arctic-text-secondary font-semibold">
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3">Roll Number</th>
                                <th className="p-3">Student Name</th>
                                <th className="p-3 text-center">P1 Attendance</th>
                                <th className="p-3 text-center">P1 Marks (6M)</th>
                                <th className="p-3 text-center">P2 Attendance</th>
                                <th className="p-3 text-center">P2 Marks (24M)</th>
                                <th className="p-3 text-center">Grand Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-arctic-border/60">
                              {project.members.map((member: ProjectMemberSummary) => {
                                const p1Att = member.attendance['PRESENTATION_1'];
                                const p2Att = member.attendance['PRESENTATION_2'];
                                const p1Marks = member.marks['PRESENTATION_1']?.stageTotalMarks;
                                const p2Marks = member.marks['PRESENTATION_2']?.stageTotalMarks;

                                const grandTotal =
                                  (p1Marks ? Number(p1Marks) : 0) +
                                  (p2Marks ? Number(p2Marks) : 0);

                                return (
                                  <tr
                                    key={member.studentId}
                                    className="hover:bg-blue-50/30 transition-colors"
                                  >
                                    <td className="p-3 text-center font-mono text-[11px] text-arctic-text-muted">
                                      {member.memberOrder}
                                    </td>

                                    <td className="p-3 font-mono font-semibold text-arctic-text-main text-[11px]">
                                      {member.rollNumber}
                                    </td>

                                    <td className="p-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-arctic-text-main">
                                          {member.name}
                                        </span>
                                        {member.isTeamLeader && (
                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                            Team Leader
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* P1 Attendance */}
                                    <td className="p-3 text-center">
                                      {p1Att === 'PRESENT' ? (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                          <Check className="h-2.5 w-2.5" />
                                          Present
                                        </span>
                                      ) : p1Att === 'ABSENT' ? (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                                          <X className="h-2.5 w-2.5" />
                                          Absent
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">—</span>
                                      )}
                                    </td>

                                    {/* P1 Marks */}
                                    <td className="p-3 text-center font-mono font-bold text-arctic-text-main">
                                      {p1Marks !== undefined && p1Marks !== null ? (
                                        <span>{Number(p1Marks).toFixed(2)}</span>
                                      ) : (
                                        <span className="text-slate-400 font-normal">—</span>
                                      )}
                                    </td>

                                    {/* P2 Attendance */}
                                    <td className="p-3 text-center">
                                      {p2Att === 'PRESENT' ? (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                          <Check className="h-2.5 w-2.5" />
                                          Present
                                        </span>
                                      ) : p2Att === 'ABSENT' ? (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                                          <X className="h-2.5 w-2.5" />
                                          Absent
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">—</span>
                                      )}
                                    </td>

                                    {/* P2 Marks */}
                                    <td className="p-3 text-center font-mono font-bold text-arctic-text-main">
                                      {p2Marks !== undefined && p2Marks !== null ? (
                                        <span>{Number(p2Marks).toFixed(2)}</span>
                                      ) : (
                                        <span className="text-slate-400 font-normal">—</span>
                                      )}
                                    </td>

                                    {/* Grand Total */}
                                    <td className="p-3 text-center font-mono font-extrabold text-arctic-primary">
                                      {grandTotal > 0 ? (
                                        <span>{grandTotal.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-slate-400 font-normal">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className="flex items-center justify-between text-[11px] text-arctic-text-muted pt-1">
                        <span>Attendance and marks records stored independently in Supabase.</span>
                        <span className="font-medium text-arctic-primary">
                          {project.members.length} verified enrolled students
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. INSTITUTIONAL WORKFLOW PIPELINE FOOTNOTE */}
      <div className="rounded-xl border border-arctic-border bg-white/80 p-5 shadow-arctic-sm space-y-3 text-xs text-arctic-text-secondary">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-arctic-text-main">
            <Layers className="h-4 w-4 text-arctic-primary" />
            <span>Institutional Project Evaluation Operational Sequence</span>
          </div>
          <Badge variant="cyan" size="sm">
            Continuous Academic Assessment
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="rounded-lg bg-slate-50 p-2.5 space-y-0.5">
            <div className="font-bold text-slate-800">1. Presentation-1 (6M)</div>
            <div className="text-[11px] text-slate-500">DPRC Panel • Novelty & Technical Feasibility</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 space-y-0.5">
            <div className="font-bold text-slate-800">2. Presentation-2 (24M)</div>
            <div className="text-[11px] text-slate-500">Evaluator Faculty • Literature & Methodology</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 space-y-0.5">
            <div className="font-bold text-slate-800">3. Evaluation-2 (30M)</div>
            <div className="text-[11px] text-slate-500">Mid-Term Review • Functional Implementation</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 space-y-0.5">
            <div className="font-bold text-slate-800">4. Evaluation-3 (40M)</div>
            <div className="text-[11px] text-slate-500">Final Defense • Viva, Testing & Documentation</div>
          </div>
        </div>
      </div>
    </div>
  );
};
