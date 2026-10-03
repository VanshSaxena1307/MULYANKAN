import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  AlertCircle,
  Save,
  CheckCircle2,
  Star,
  Users,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  TeacherProjectSummary,
  ProjectMemberSummary,
  TeacherRole,
  EvaluationStageCode,
  EVALUATION_STAGE_CONFIG,
  CanonicalEvaluationStage,
  ProjectEvaluationDataResponse,
  EvaluationStudentRow,
  AttendanceStatus,
} from '@mulyankan/shared';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { useAuth } from '../../context/AuthContext';

interface ProjectEvaluationEditorProps {
  project: TeacherProjectSummary;
  activeRole: TeacherRole;
  onSaved: () => void;
}

interface StudentDraftState {
  attendance: AttendanceStatus | '';
  marksStr: string; // string to differentiate "" (null) from "0"
  remarks: string;
  error?: string;
}

export const ProjectEvaluationEditor: React.FC<ProjectEvaluationEditorProps> = ({
  project,
  activeRole,
  onSaved,
}) => {
  const { token } = useAuth();

  // 1. Stage selection state (P1, P2, E2, E3)
  const [selectedStageCode, setSelectedStageCode] = useState<EvaluationStageCode>('P1');
  const [loadingStageData, setLoadingStageData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 2. Draft editable state for enrolled students
  const [draftState, setDraftState] = useState<Record<string, StudentDraftState>>({});
  const [studentsList, setStudentsList] = useState<EvaluationStudentRow[]>([]);

  // 3. Save states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // 4. Toggle historical view
  const [showFullLedger, setShowFullLedger] = useState<boolean>(false);

  // Stage mapping helper
  const stageConfigMap: Record<EvaluationStageCode, (typeof EVALUATION_STAGE_CONFIG)[CanonicalEvaluationStage]> = {
    P1: EVALUATION_STAGE_CONFIG.PRESENTATION_1,
    P2: EVALUATION_STAGE_CONFIG.PRESENTATION_2,
    E2: EVALUATION_STAGE_CONFIG.EVALUATION_2,
    E3: EVALUATION_STAGE_CONFIG.EVALUATION_3,
  };
  const currentStageMeta = stageConfigMap[selectedStageCode];

  // Fetch stage evaluation data from server
  const loadStageData = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingStageData(true);
      setFetchError(null);
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);

      const res = await fetch(
        `/api/teacher/projects/${encodeURIComponent(project.projectId)}/evaluation?role=${encodeURIComponent(
          activeRole
        )}&stage=${selectedStageCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch evaluation data (HTTP ${res.status})`);
      }

      const data: ProjectEvaluationDataResponse = await res.json();
      setStudentsList(data.students);

      // Populate draft state: preserve NULL as empty string and 0 as "0"
      const initialDraft: Record<string, StudentDraftState> = {};
      for (const s of data.students) {
        let marksStr = '';
        if (s.marks !== null && s.marks !== undefined) {
          marksStr = String(s.marks);
        }

        initialDraft[s.studentId] = {
          attendance: s.attendance || '',
          marksStr,
          remarks: s.remarks || '',
        };
      }

      setDraftState(initialDraft);
    } catch (err: any) {
      console.error('Error loading stage data:', err);
      setFetchError(err.message || 'Failed to retrieve stage evaluation data');
    } finally {
      setLoadingStageData(false);
    }
  }, [project.projectId, activeRole, selectedStageCode, token]);

  useEffect(() => {
    loadStageData();
  }, [loadStageData]);

  // Handle Marks change with validation
  const handleMarkChange = (studentId: string, val: string) => {
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    let error: string | undefined = undefined;

    if (val.trim() !== '') {
      const num = Number(val);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        error = 'Must be a valid number';
      } else if (num < 0) {
        error = 'Cannot be negative';
      } else if (num > currentStageMeta.maxMarks) {
        error = `Max ${currentStageMeta.maxMarks} marks`;
      }
    }

    setDraftState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksStr: val,
        error,
      },
    }));
  };

  // Handle Attendance status change
  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    setDraftState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        attendance: status,
      },
    }));
  };

  // Quick action: Mark all present
  const markAllPresent = () => {
    setSaveSuccessMessage(null);
    setDraftState((prev) => {
      const updated = { ...prev };
      for (const s of studentsList) {
        if (updated[s.studentId]) {
          updated[s.studentId] = {
            ...updated[s.studentId],
            attendance: 'PRESENT',
          };
        }
      }
      return updated;
    });
  };

  // Save changes via batch endpoint
  const handleSaveChanges = async () => {
    if (!token) return;

    // Check for any client-side validation errors
    for (const s of studentsList) {
      const draft = draftState[s.studentId];
      if (draft && draft.marksStr.trim() !== '') {
        const num = Number(draft.marksStr);
        if (Number.isNaN(num) || !Number.isFinite(num)) {
          setSaveErrorMessage(`Invalid marks format for ${s.name} (${s.rollNumber}).`);
          return;
        }
        if (num < 0) {
          setSaveErrorMessage(`Marks for ${s.name} cannot be negative.`);
          return;
        }
        if (num > currentStageMeta.maxMarks) {
          setSaveErrorMessage(
            `Marks for ${s.name} (${num}) exceeds maximum allowed of ${currentStageMeta.maxMarks}.`
          );
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);

      const records = studentsList.map((s) => {
        const draft = draftState[s.studentId];
        const trimmedMarks = draft?.marksStr?.trim() ?? '';
        const marks = trimmedMarks === '' ? null : Number(trimmedMarks);

        return {
          studentId: s.studentId,
          attendance: draft?.attendance ? (draft.attendance as AttendanceStatus) : null,
          marks,
          remarks: draft?.remarks?.trim() || null,
        };
      });

      const res = await fetch(`/api/teacher/projects/${encodeURIComponent(project.projectId)}/evaluation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: activeRole,
          stage: selectedStageCode,
          records,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server rejected evaluation update (HTTP ${res.status})`);
      }

      setSaveSuccessMessage(
        `Successfully saved attendance and marks for ${currentStageMeta.name}.`
      );

      // Reload fresh data and trigger dashboard refresh
      await loadStageData();
      onSaved();
    } catch (err: any) {
      console.error('Save evaluation error:', err);
      setSaveErrorMessage(err.message || 'Failed to save evaluation records.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyErrors = Object.values(draftState).some((d) => !!d.error);

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Evaluation Stage Selector Tabs */}
      <div className="rounded-xl border border-arctic-border bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-arctic-primary">
              Evaluation Stage
            </span>
            <h4 className="text-sm font-bold text-arctic-text-main flex items-center gap-2">
              <span>{currentStageMeta.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Max {currentStageMeta.maxMarks} Marks
              </span>
            </h4>
            <p className="text-[11px] text-arctic-text-muted mt-0.5">
              {currentStageMeta.description} • Scoped under role: <strong>{activeRole}</strong>
            </p>
          </div>

          {/* Stage Switch Buttons */}
          <div className="inline-flex rounded-lg border border-arctic-border bg-slate-50 p-1 gap-1">
            {(['P1', 'P2', 'E2', 'E3'] as EvaluationStageCode[]).map((stageCode) => {
              const meta = stageConfigMap[stageCode];
              const isSelected = selectedStageCode === stageCode;

              return (
                <button
                  key={stageCode}
                  type="button"
                  onClick={() => setSelectedStageCode(stageCode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-white text-arctic-primary shadow-xs border border-arctic-border'
                      : 'text-arctic-text-muted hover:text-arctic-text-main hover:bg-slate-200/50'
                  }`}
                >
                  {meta.code} ({meta.maxMarks}M)
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Loading / Error States */}
      {loadingStageData && (
        <div className="p-8 text-center rounded-xl border border-arctic-border bg-white/70 space-y-2">
          <RefreshCw className="h-6 w-6 text-arctic-primary animate-spin mx-auto" />
          <p className="text-xs text-arctic-text-secondary">Loading evaluation ledger for {currentStageMeta.name}...</p>
        </div>
      )}

      {fetchError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <div className="flex-1 font-medium">{fetchError}</div>
          <Button size="sm" variant="outline" onClick={loadStageData}>
            Retry
          </Button>
        </div>
      )}

      {/* 3. Editable Student Ledger Table */}
      {!loadingStageData && !fetchError && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-arctic-text-main flex items-center gap-1.5">
                <Users className="h-4 w-4 text-arctic-primary" />
                Student Attendance & Marks Entry ({studentsList.length} Students)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllPresent}
                className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition-colors flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark All Present
              </button>

              <button
                type="button"
                onClick={() => setShowFullLedger(!showFullLedger)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors flex items-center gap-1"
              >
                {showFullLedger ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3 text-slate-500" />}
                {showFullLedger ? 'Hide Historical Ledger' : 'View Full Historical Ledger'}
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {saveSuccessMessage && (
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{saveSuccessMessage}</span>
            </div>
          )}

          {saveErrorMessage && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{saveErrorMessage}</span>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-arctic-border bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-arctic-border bg-slate-50/80 text-[11px] text-arctic-text-secondary font-semibold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 w-32">Roll Number</th>
                  <th className="p-3 min-w-[180px]">Student Name</th>
                  <th className="p-3 w-44 text-center">Attendance Status</th>
                  <th className="p-3 w-40 text-center">
                    Marks (Max: {currentStageMeta.maxMarks})
                  </th>
                  <th className="p-3 min-w-[160px]">Remarks / Evaluation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arctic-border/60">
                {studentsList.map((student) => {
                  const draft = draftState[student.studentId] || {
                    attendance: '',
                    marksStr: '',
                    remarks: '',
                  };

                  return (
                    <tr
                      key={student.studentId}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Member Order */}
                      <td className="p-3 text-center font-mono text-[11px] text-arctic-text-muted">
                        {student.memberOrder}
                      </td>

                      {/* Roll Number */}
                      <td className="p-3 font-mono font-semibold text-arctic-text-main text-[11px]">
                        {student.rollNumber}
                      </td>

                      {/* Student Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-arctic-text-main">
                            {student.name}
                          </span>
                          {student.isTeamLeader && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              Leader
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attendance Toggle Buttons */}
                      <td className="p-3 text-center">
                        <div className="inline-flex rounded-lg border border-arctic-border bg-slate-100 p-0.5 gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(student.studentId, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                              draft.attendance === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(student.studentId, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                              draft.attendance === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-white/60'
                            }`}
                          >
                            <X className="h-3 w-3" />
                            Absent
                          </button>
                        </div>
                      </td>

                      {/* Marks Input */}
                      <td className="p-3 text-center">
                        <div className="inline-block relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={currentStageMeta.maxMarks}
                            placeholder="Not entered"
                            value={draft.marksStr}
                            onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                            className={`w-28 px-3 py-1.5 text-center font-mono font-bold text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                              draft.error
                                ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-200'
                                : draft.marksStr !== ''
                                ? 'border-blue-400 bg-blue-50/30 text-arctic-text-main focus:ring-blue-200'
                                : 'border-arctic-border bg-white text-slate-400 focus:ring-arctic-primary/20'
                            }`}
                          />
                          {draft.error && (
                            <div className="text-[10px] text-rose-600 font-semibold mt-0.5 text-left">
                              {draft.error}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Remarks Input */}
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={draft.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftState((prev) => ({
                              ...prev,
                              [student.studentId]: {
                                ...prev[student.studentId],
                                remarks: val,
                              },
                            }));
                          }}
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-arctic-border bg-white focus:outline-none focus:ring-1 focus:ring-arctic-primary/30"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <div className="text-xs text-arctic-text-muted flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>
                Changes are validated server-side. Unentered marks remain blank/NULL (not converted to 0).
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadStageData}
                disabled={isSaving}
              >
                Reset
              </Button>

              <Button
                variant="primary"
                size="sm"
                isLoading={isSaving}
                disabled={isSaving || hasAnyErrors}
                onClick={handleSaveChanges}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save {currentStageMeta.name} Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Optional Historical 4-Stage Summary Ledger */}
      {showFullLedger && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-arctic-text-main uppercase tracking-wider flex items-center gap-1.5">
              <span>All 4 Stages Historical Summary Ledger</span>
              <Badge variant="cyan" size="sm">
                Continuous Evaluation Record
              </Badge>
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-arctic-border bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-arctic-border bg-slate-50/80 text-[11px] text-arctic-text-secondary font-semibold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">P1 (6M)</th>
                  <th className="p-3 text-center">P2 (24M)</th>
                  <th className="p-3 text-center">E2 (30M)</th>
                  <th className="p-3 text-center">E3 (40M)</th>
                  <th className="p-3 text-center font-bold">Total (100M)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arctic-border/60">
                {project.members.map((member: ProjectMemberSummary) => {
                  const p1 = member.marks['PRESENTATION_1']?.stageTotalMarks;
                  const p2 = member.marks['PRESENTATION_2']?.stageTotalMarks;
                  const e2 = member.marks['EVALUATION_2']?.stageTotalMarks;
                  const e3 = member.marks['EVALUATION_3']?.stageTotalMarks;

                  const total =
                    (p1 ? Number(p1) : 0) +
                    (p2 ? Number(p2) : 0) +
                    (e2 ? Number(e2) : 0) +
                    (e3 ? Number(e3) : 0);

                  return (
                    <tr key={member.studentId} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center font-mono text-[11px] text-arctic-text-muted">
                        {member.memberOrder}
                      </td>
                      <td className="p-3 font-mono font-semibold text-arctic-text-main text-[11px]">
                        {member.rollNumber}
                      </td>
                      <td className="p-3 font-medium text-arctic-text-main">
                        {member.name}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {p1 !== undefined && p1 !== null ? Number(p1).toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {p2 !== undefined && p2 !== null ? Number(p2).toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {e2 !== undefined && e2 !== null ? Number(e2).toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {e3 !== undefined && e3 !== null ? Number(e3).toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-arctic-primary">
                        {total > 0 ? total.toFixed(2) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
