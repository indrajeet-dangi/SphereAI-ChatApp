import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const ProtectedRoute = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth0();
  const token = localStorage.getItem("token");

  if (isLoading) {
    return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
  }

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
