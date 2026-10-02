import React from 'react';
import { TeacherRole, getRoleSwitchConfirmationMessage } from '@mulyankan/shared';
import { Modal } from '../base/Modal';
import { Button } from '../base/Button';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: TeacherRole;
  targetRole: TeacherRole;
  onConfirm: (targetRole: TeacherRole) => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  targetRole,
  onConfirm,
}) => {
  const confirmationMessage = getRoleSwitchConfirmationMessage(currentRole, targetRole);

  const handleConfirm = () => {
    onConfirm(targetRole);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Role Switch"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            leftIcon={<ArrowLeftRight className="h-3.5 w-3.5" />}
          >
            Switch to {targetRole}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-blue-50/80 p-3.5 border border-blue-200/70 text-blue-900">
          <AlertCircle className="h-5 w-5 text-arctic-primary shrink-0 mt-0.5" />
          <div className="text-sm font-medium">
            {confirmationMessage}
          </div>
        </div>

        <p className="text-xs text-arctic-text-secondary leading-relaxed">
          Switching your active operational role updates your workspace context immediately without requiring you to log out.
        </p>
      </div>
    </Modal>
  );
};
