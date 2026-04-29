import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { auth0LoginUser } from "../services/api";
import { normalizeLanguage } from "../constants/languages";
import { useUserContext } from "../context/UserContext";

const AUTH_DEBUG = String(import.meta.env.VITE_DEBUG_AUTH0 || "").toLowerCase() === "true";

const AuthHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser } = useUserContext();
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    const syncAuth0Session = async () => {
      if (AUTH_DEBUG) {
        // Debug-only callback trace for deployed auth flow.
        console.debug("[AuthHandler] state", {
          url: window.location.href,
          isLoading,
          isAuthenticated,
          hasUser: Boolean(user),
          hasAppToken: Boolean(localStorage.getItem("token")),
        });
      }

      if (isLoading || !isAuthenticated || !user) return;
      const existingToken = localStorage.getItem("token");
      if (existingToken) return;
      if (syncInFlightRef.current) return;

      syncInFlightRef.current = true;
      try {
        let auth0Token = "";
        try {
          auth0Token = await getAccessTokenSilently();
        } catch {
          auth0Token = "";
        }

        if (auth0Token) {
          localStorage.setItem("auth0_access_token", auth0Token);
        }

        const data = await auth0LoginUser({
          name: user.name,
          email: user.email,
          picture: user.picture,
          sub: user.sub,
        });

        if (AUTH_DEBUG) {
          console.debug("[AuthHandler] backend auth0-login success", {
            hasToken: Boolean(data?.token),
            hasUser: Boolean(data?.user),
          });
        }

        if (data?.token) {
          localStorage.setItem("token", data.token);
        }

        if (data?.user) {
          setCurrentUser({
            ...data.user,
            language: normalizeLanguage(data.user.language),
          });
        }

        if (location.pathname === "/login" || location.pathname === "/") {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        if (AUTH_DEBUG) {
          console.debug("[AuthHandler] backend auth0-login failed");
        }
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        sessionStorage.setItem("auth_sync_error", "Unable to complete sign in. Please try again.");
        if (location.pathname !== "/login") {
          navigate("/login", { replace: true });
        }
      } finally {
        syncInFlightRef.current = false;
      }
    };

    syncAuth0Session();
  }, [
    isLoading,
    isAuthenticated,
    user,
    getAccessTokenSilently,
    location.pathname,
    navigate,
    setCurrentUser,
  ]);

  return children;
};

export default AuthHandler;
