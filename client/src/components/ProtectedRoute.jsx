import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const ProtectedRoute = ({ children }) => {
  const { isLoading } = useAuth0();
  const token = localStorage.getItem("token");

  if (isLoading) {
    return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
  }

  if (!token) {
    // Auth0 may be authenticated before backend JWT is minted; force sync via login page.
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
