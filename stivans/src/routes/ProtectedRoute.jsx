import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function ProtectedRoute() {
  const { user, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
