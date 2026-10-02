import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/base/Card';
import { Button } from '../components/base/Button';
import { Badge } from '../components/base/Badge';
import { RoleBadge } from '../components/role/RoleBadge';
import { useAuth } from '../context/AuthContext';
import {
  INITIAL_ACADEMIC_YEARS,
  EVALUATION_LIFECYCLE_STAGES,
  EvaluationLifecycleStage,
  TeacherRole,
} from '@mulyankan/shared';
import {
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  FileSpreadsheet,
  Info,
  ChevronRight,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { activeRole, requestRoleSwitch } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const otherRole: TeacherRole = activeRole === 'Guide' ? 'Evaluator' : 'Guide';

  return (
    <div className="space-y-8 py-2">
      {/* Faculty Workspace Header */}
      <div className="rounded-2xl border border-arctic-border bg-white/90 p-6 sm:p-8 shadow-arctic-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-arctic-text-muted uppercase tracking-wider">
              Faculty Workspace
            </span>
            <RoleBadge role={activeRole} size="sm" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-arctic-text-main tracking-tight">
            Academic Project Evaluations
          </h1>
          <p className="text-xs sm:text-sm text-arctic-text-secondary max-w-2xl leading-relaxed">
            Operating as <strong className="text-arctic-primary">{activeRole}</strong>.
            You can dynamically switch between Guide and Evaluator roles without logging out.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => requestRoleSwitch(otherRole)}
            leftIcon={<ArrowLeftRight className="h-4 w-4 text-arctic-primary" />}
          >
            Switch to {otherRole}
          </Button>
        </div>
      </div>

      {/* Selectable Academic Year Cohorts */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-arctic-text-main flex items-center gap-2">
            <Calendar className="h-5 w-5 text-arctic-primary" />
            Select Academic Year Cohort
          </h2>
          <p className="text-xs text-arctic-text-secondary">
            Select an academic year to review teams, students, marks, and attendance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {INITIAL_ACADEMIC_YEARS.map((year) => {
            const isSelected = selectedYear === year;
            return (
              <Card
                key={year}
                interactive
                onClick={() => setSelectedYear(year)}
                className={`transition-all ${
                  isSelected
                    ? 'ring-2 ring-arctic-primary border-arctic-primary bg-blue-50/40'
                    : 'border-arctic-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant={isSelected ? 'primary' : 'default'} size="sm">
                      {year}
                    </Badge>
                    <h3 className="text-xl font-bold text-arctic-text-main mt-2">
                      {year} Academic Project Evaluation
                    </h3>
                    <p className="text-xs text-arctic-text-secondary mt-1">
                      Teams and individual student marks pipeline.
                    </p>
                  </div>
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-arctic-primary text-white shadow-md'
                        : 'bg-slate-100 text-arctic-text-secondary'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-arctic-border/60 flex items-center justify-between text-xs">
                  <span className="text-arctic-text-muted">Extensible cohort container</span>
                  <span className="font-semibold text-arctic-primary">
                    {isSelected ? 'Active Selection' : 'Click to Select'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Evaluation Workflow Flowchart Reference */}
      <div className="rounded-xl border border-arctic-border bg-white/80 p-6 shadow-arctic-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-arctic-primary" />
            <h3 className="text-sm font-bold text-arctic-text-main">
              Institutional Evaluation Lifecycle Pipeline
            </h3>
          </div>
          <Badge variant="cyan" size="sm">Standard Operational Sequence</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {EVALUATION_LIFECYCLE_STAGES.map((stage: EvaluationLifecycleStage, idx) => (
            <div
              key={stage}
              className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start rounded-lg border border-arctic-border/70 bg-white/90 p-3 shadow-arctic-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-arctic-primary">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-arctic-text-main">
                  {stage.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[10px] text-arctic-text-muted mt-1">
                {idx === 0
                  ? 'Scheduled'
                  : idx === 1
                  ? 'Session Active'
                  : idx === 2
                  ? 'Separate Records'
                  : idx === 3
                  ? 'Review'
                  : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Excel Data Integration Readiness Notice */}
      <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/30 p-6 text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-arctic-primary">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div className="max-w-lg mx-auto space-y-1">
          <h4 className="text-sm font-bold text-arctic-text-main">
            Ready for Official Institutional Excel Ingestion
          </h4>
          <p className="text-xs text-arctic-text-secondary leading-relaxed">
            Project teams, Roll Numbers, team leaders (first listed member), and individual marks rubrics will be synchronized from the official college Excel sheets in subsequent integration tasks.
          </p>
        </div>
        <div className="flex justify-center gap-4 text-xs font-medium text-arctic-text-muted pt-2">
          <span>✓ Student-Specific Roll No.</span>
          <span>•</span>
          <span>✓ Project ID Team Identity</span>
          <span>•</span>
          <span>✓ Independent Attendance & Marks Records</span>
        </div>
      </div>
    </div>
  );
};
