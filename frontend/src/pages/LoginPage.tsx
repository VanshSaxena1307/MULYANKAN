import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/base/Card';
import { Input } from '../components/base/Input';
import { Button } from '../components/base/Button';
import { Badge } from '../components/base/Badge';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, KeyRound, AlertCircle, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('faculty@abes');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please provide your institutional faculty username');
      return;
    }
    login(username);
    navigate('/teacher');
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-arctic-primary text-white shadow-lg shadow-arctic-primary/30 border border-white/50">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-arctic-text-main">
            MULYANKAN
          </h1>
          <p className="text-xs text-arctic-text-secondary">
            Faculty Authentication Portal
          </p>
        </div>

        <Card className="border-arctic-border/90 shadow-arctic-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Teacher Login</CardTitle>
              <Badge variant="primary" size="sm">Single Teacher Sign-In</Badge>
            </div>
            <CardDescription className="text-xs">
              Enter your institutional credentials provided by the college administration.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Faculty Username"
                placeholder="firstname@abes"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                helperText="Standard institutional format: firstname@abes"
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                helperText="First-time users must enter their temporary password."
              />

              <div className="rounded-lg bg-amber-50/80 p-3 border border-amber-200/70 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <KeyRound className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>First Login Policy:</strong> Faculty logging in for the first time with an initial temporary password will be prompted to set a permanent private password before proceeding.
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" leftIcon={<Lock className="h-4 w-4" />}>
                Authenticate & Enter Workspace
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-center text-xs text-arctic-text-muted space-y-1">
          <div className="font-semibold text-arctic-text-secondary flex items-center justify-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-arctic-primary" />
            Institutional Access Only
          </div>
          <p>
            Student logins are not supported. Only verified faculty and administrators can access evaluation tools.
          </p>
        </div>
      </div>
    </div>
  );
};
