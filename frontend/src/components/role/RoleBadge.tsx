import React from 'react';
import { TeacherRole } from '@mulyankan/shared';
import { Badge } from '../base/Badge';
import { BookOpen, Award } from 'lucide-react';

interface RoleBadgeProps {
  role: TeacherRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  if (role === 'Guide') {
    return (
      <Badge variant="primary" size={size} className="gap-1.5 font-semibold">
        <BookOpen className="h-3 w-3 text-arctic-primary" />
        <span>Guide</span>
      </Badge>
    );
  }

  return (
    <Badge variant="cyan" size={size} className="gap-1.5 font-semibold">
      <Award className="h-3 w-3 text-cyan-600" />
      <span>Evaluator</span>
    </Badge>
  );
};
