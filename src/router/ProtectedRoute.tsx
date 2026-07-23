import { useEffect, useState, type ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { SkeletonCardGrid } from '@/components/common/LoadingSkeleton';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const managementKey = useAuthStore((state) => state.managementKey);
  const apiBase = useAuthStore((state) => state.apiBase);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const tryRestore = async () => {
      if (!isAuthenticated && managementKey && apiBase) {
        setChecking(true);
        try {
          await checkAuth();
        } finally {
          setChecking(false);
        }
      }
    };
    tryRestore();
  }, [apiBase, isAuthenticated, managementKey, checkAuth]);

  if (checking) {
    return (
      <div className="main-content" aria-busy="true">
        <SkeletonCardGrid count={3} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
