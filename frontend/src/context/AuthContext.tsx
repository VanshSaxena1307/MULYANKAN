import React, { createContext, useContext, useState } from 'react';
import { TeacherRole, DEFAULT_TEACHER_ROLE } from '@mulyankan/shared';
import { RoleSwitchModal } from '../components/role/RoleSwitchModal';

interface AuthContextType {
  activeRole: TeacherRole;
  switchRole: (newRole: TeacherRole) => void;
  requestRoleSwitch: (targetRole: TeacherRole) => void;
  isAuthenticated: boolean;
  currentUser: {
    username: string;
    name: string;
  } | null;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<TeacherRole>(DEFAULT_TEACHER_ROLE);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<TeacherRole>('Evaluator');

  // Initial authentication state must be unauthenticated with null user
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string } | null>(null);

  const requestRoleSwitch = (newRole: TeacherRole) => {
    if (newRole === activeRole) return;
    setTargetRole(newRole);
    setIsRoleModalOpen(true);
  };

  const switchRole = (newRole: TeacherRole) => {
    setActiveRole(newRole);
  };

  const login = (username: string) => {
    setCurrentUser({
      username,
      name: username.split('@')[0],
    });
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        activeRole,
        switchRole,
        requestRoleSwitch,
        isAuthenticated: !!currentUser,
        currentUser,
        login,
        logout,
      }}
    >
      {children}
      <RoleSwitchModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentRole={activeRole}
        targetRole={targetRole}
        onConfirm={switchRole}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
