import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TeacherRole, DEFAULT_TEACHER_ROLE } from '@mulyankan/shared';
import { RoleSwitchModal } from '../components/role/RoleSwitchModal';

export interface CurrentTeacherUser {
  id: string;
  userId: string;
  username: string; // equals userId for backward compatibility
  name: string;
  role: string;
  department: string;
  designation: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  activeRole: TeacherRole;
  availableRoles: TeacherRole[];
  setAvailableRoles: (roles: TeacherRole[]) => void;
  switchRole: (newRole: TeacherRole) => void;
  requestRoleSwitch: (targetRole: TeacherRole) => void;
  isAuthenticated: boolean;
  currentUser: CurrentTeacherUser | null;
  token: string | null;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  handleUnauthorized: (message?: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<TeacherRole>(() => {
    const saved = localStorage.getItem('mulyankan_active_role');
    return (saved as TeacherRole) || DEFAULT_TEACHER_ROLE;
  });

  const [availableRoles, setAvailableRolesState] = useState<TeacherRole[]>(() => {
    const saved = localStorage.getItem('mulyankan_available_roles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ['Guide', 'Evaluator'];
      }
    }
    return ['Guide', 'Evaluator'];
  });

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<TeacherRole>('Evaluator');
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mulyankan_token');
  });

  const [currentUser, setCurrentUser] = useState<CurrentTeacherUser | null>(() => {
    const saved = localStorage.getItem('mulyankan_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setAvailableRoles = useCallback((roles: TeacherRole[]) => {
    if (roles && roles.length > 0) {
      setAvailableRolesState(roles);
      localStorage.setItem('mulyankan_available_roles', JSON.stringify(roles));
      // If current active role is not in available roles, select first available role
      setActiveRole((prev) => {
        if (!roles.includes(prev)) {
          const next = roles[0];
          localStorage.setItem('mulyankan_active_role', next);
          return next;
        }
        return prev;
      });
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('mulyankan_token');
    localStorage.removeItem('mulyankan_user');
    localStorage.removeItem('mulyankan_active_role');
    localStorage.removeItem('mulyankan_available_roles');
  }, []);

  const handleUnauthorized = useCallback((message = 'Your session has expired. Please sign in again.') => {
    logout();
    setSessionExpiredMessage(message);
  }, [logout]);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  // Verify session on mount with /api/auth/me
  useEffect(() => {
    const verifySession = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.teacher) {
            const user: CurrentTeacherUser = {
              id: data.teacher.id,
              userId: data.teacher.userId,
              username: data.teacher.userId,
              name: data.teacher.name,
              role: data.teacher.role,
              department: data.teacher.department,
              designation: data.teacher.designation,
              mustChangePassword: data.teacher.mustChangePassword,
            };
            setCurrentUser(user);
            localStorage.setItem('mulyankan_user', JSON.stringify(user));
          }
        } else if (res.status === 401) {
          handleUnauthorized();
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      }
    };

    verifySession();
  }, [token, handleUnauthorized]);

  const requestRoleSwitch = (newRole: TeacherRole) => {
    if (newRole === activeRole) return;
    setTargetRole(newRole);
    setIsRoleModalOpen(true);
  };

  const switchRole = (newRole: TeacherRole) => {
    setActiveRole(newRole);
    localStorage.setItem('mulyankan_active_role', newRole);
  };

  const login = async (inputUserId: string, inputPassword: string): Promise<void> => {
    setSessionExpiredMessage(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: inputUserId.trim(),
        password: inputPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed. Please check your credentials.');
    }

    const { token: receivedToken, teacher } = data;
    const user: CurrentTeacherUser = {
      id: teacher.id,
      userId: teacher.userId,
      username: teacher.userId,
      name: teacher.name,
      role: teacher.role,
      department: teacher.department,
      designation: teacher.designation,
      mustChangePassword: teacher.mustChangePassword,
    };

    setToken(receivedToken);
    setCurrentUser(user);
    localStorage.setItem('mulyankan_token', receivedToken);
    localStorage.setItem('mulyankan_user', JSON.stringify(user));
  };

  return (
    <AuthContext.Provider
      value={{
        activeRole,
        availableRoles,
        setAvailableRoles,
        switchRole,
        requestRoleSwitch,
        isAuthenticated: !!currentUser && !!token,
        currentUser,
        token,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        handleUnauthorized,
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
