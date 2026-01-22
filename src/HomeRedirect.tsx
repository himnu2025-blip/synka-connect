import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCachedUserEmail, getCachedUserName } from "@/lib/appLock";

export default function HomeRedirect() {
  const { user } = useAuth();

  const cachedEmail = getCachedUserEmail();
  const cachedName = getCachedUserName();
  const hasCachedUser = !!cachedEmail || !!cachedName;

  // ✅ Logged in → app
  if (user) {
    return <Navigate to="/my-card" replace />;
  }

  // 🔐 Cached user (same device) → login
  if (hasCachedUser) {
    return <Navigate to="/login" replace />;
  }

  // 🆕 First time device → landing
  return <Navigate to="/index" replace />;
}
