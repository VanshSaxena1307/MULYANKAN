import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/base/Card';
import { Button } from '../components/base/Button';
import { Badge } from '../components/base/Badge';
import { INITIAL_ACADEMIC_YEARS, EVALUATION_STRUCTURE, EVALUATION_GRAND_TOTAL_MAX } from '@mulyankan/shared';
import {
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Award,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-arctic-border bg-gradient-to-b from-white/90 to-[#EAF3FA]/80 p-8 sm:p-12 shadow-arctic-card backdrop-blur-xl">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" className="px-3 py-1 font-semibold">
              Institutional Platform
            </Badge>
            <Badge variant="cyan" className="px-3 py-1">
              Arctic Glass Interface
            </Badge>
            <span className="text-xs text-arctic-text-muted">Production Architecture Shell</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-arctic-text-main">
            MULYANKAN
          </h1>
          <p className="text-lg sm:text-xl font-medium text-arctic-primary">
            Academic Project Evaluation Platform
          </p>

          <p className="text-sm sm:text-base text-arctic-text-secondary leading-relaxed max-w-2xl">
            A unified evaluation system engineered for college faculty and academic administrators.
            Supports dynamic role switching between Project Guide and Evaluator, student-specific
            attendance and criteria-driven mark evaluation.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/teacher">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Enter Faculty Workspace
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Faculty Authentication
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Selectable Academic Year Cohorts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-arctic-text-main flex items-center gap-2">
              <Calendar className="h-5 w-5 text-arctic-primary" />
              Active Academic Years
            </h2>
            <p className="text-xs text-arctic-text-secondary">
              Select an academic cohort to inspect project teams and individual student evaluations.
            </p>
          </div>
          <Badge variant="default" size="sm">
            Extensible Architecture
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {INITIAL_ACADEMIC_YEARS.map((year) => (
            <Link key={year} to="/teacher" className="group block">
              <Card interactive className="border-arctic-border/80 group-hover:border-blue-300">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-arctic-primary uppercase tracking-wider">
                      Academic Cohort
                    </span>
                    <h3 className="text-2xl font-bold text-arctic-text-main mt-1 group-hover:text-arctic-primary transition-colors">
                      {year}
                    </h3>
                    <p className="text-xs text-arctic-text-secondary mt-2">
                      Structured project evaluation sessions for {year} teams and individual student candidates.
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-arctic-primary group-hover:bg-arctic-primary group-hover:text-white transition-all">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-arctic-border/60 flex items-center justify-between text-xs text-arctic-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-arctic-primary" />
                    Team & Student Scope
                  </span>
                  <span className="font-semibold text-arctic-primary group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    Open Cohort →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Official Institutional Evaluation Breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-arctic-text-main flex items-center gap-2">
              <Award className="h-5 w-5 text-arctic-primary" />
              Standard Evaluation Criteria (100 Marks)
            </h2>
            <p className="text-xs text-arctic-text-secondary">
              Marks are calculated strictly from constituent institutional criteria, not hardcoded totals.
            </p>
          </div>
          <Badge variant="cyan" size="sm">
            Grand Total: {EVALUATION_GRAND_TOTAL_MAX}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(EVALUATION_STRUCTURE).map(([key, config]) => (
            <div
              key={key}
              className="rounded-xl border border-arctic-border bg-white/80 p-4 shadow-arctic-sm backdrop-blur-sm"
            >
              <div className="text-[11px] font-semibold text-arctic-text-muted uppercase tracking-wider">
                Criterion
              </div>
              <div className="text-sm font-bold text-arctic-text-main mt-1">
                {config.label}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-arctic-primary">
                  {config.maxMarks}
                </span>
                <span className="text-xs text-arctic-text-muted font-medium">max marks</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Institutional Data Integrity Notice */}
      <section className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-5 text-arctic-text-secondary">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-arctic-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-semibold text-arctic-text-main text-sm">
              Data Integrity & Excel Source of Truth
            </h4>
            <p className="leading-relaxed">
              In accordance with institutional guidelines, no mock or simulated students, teachers, or marks have been injected into this repository. Real student Roll Numbers, Project IDs, and faculty allocations will be populated directly from official institutional Excel ledgers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
