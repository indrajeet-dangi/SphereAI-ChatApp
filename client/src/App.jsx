import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth0();
  const token = localStorage.getItem("token");
  const isSignedIn = Boolean(token || isAuthenticated);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isSignedIn ? "/dashboard" : "/login"} replace />} />
      <Route
        path="/login"
        element={isLoading ? <div className="p-6 text-center text-slate-600">Loading...</div> : (isSignedIn ? <Navigate to="/dashboard" replace /> : <Login />)}
      />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isSignedIn ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
