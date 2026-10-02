import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/base/Button';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="text-6xl font-extrabold text-arctic-primary">404</div>
      <h2 className="text-xl font-bold text-arctic-text-main">Page Not Found</h2>
      <p className="text-xs text-arctic-text-secondary max-w-sm">
        The requested institutional route does not exist or you do not have appropriate faculty authorization.
      </p>
      <Link to="/">
        <Button variant="primary" size="sm" leftIcon={<Home className="h-4 w-4" />}>
          Return to Platform Home
        </Button>
      </Link>
    </div>
  );
};
