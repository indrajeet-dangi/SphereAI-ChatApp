import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const ProtectedRoute = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth0();
  const token = localStorage.getItem("token");
  const isAuthSyncPending = Boolean(!token && isAuthenticated && !isLoading);

  if (isLoading || isAuthSyncPending) {
    return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
