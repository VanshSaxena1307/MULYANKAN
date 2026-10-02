import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { TeacherDashboard } from '../pages/TeacherDashboard';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <LandingPage />
      </AppShell>
    ),
  },
  {
    path: '/login',
    element: (
      <AppShell>
        <LoginPage />
      </AppShell>
    ),
  },
  {
    path: '/teacher',
    element: (
      <AppShell>
        <TeacherDashboard />
      </AppShell>
    ),
  },
  {
    path: '*',
    element: (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    ),
  },
]);
