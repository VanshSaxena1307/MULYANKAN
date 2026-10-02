import React, { createContext, useContext, useState, useEffect } from 'react';
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
  switchRole: (newRole: TeacherRole) => void;
  requestRoleSwitch: (targetRole: TeacherRole) => void;
  isAuthenticated: boolean;
  currentUser: CurrentTeacherUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<TeacherRole>(DEFAULT_TEACHER_ROLE);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<TeacherRole>('Evaluator');

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

  // Optional: verify token on mount with /api/auth/me
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
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      }
    };

    verifySession();
  }, [token]);

  const requestRoleSwitch = (newRole: TeacherRole) => {
    if (newRole === activeRole) return;
    setTargetRole(newRole);
    setIsRoleModalOpen(true);
  };

  const switchRole = (newRole: TeacherRole) => {
    setActiveRole(newRole);
  };

  const login = async (inputUserId: string, inputPassword: string): Promise<void> => {
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

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('mulyankan_token');
    localStorage.removeItem('mulyankan_user');
  };

  return (
    <AuthContext.Provider
      value={{
        activeRole,
        switchRole,
        requestRoleSwitch,
        isAuthenticated: !!currentUser,
        currentUser,
        token,
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
