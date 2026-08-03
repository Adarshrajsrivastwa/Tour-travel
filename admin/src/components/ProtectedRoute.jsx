import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * ProtectedRoute component that enforces role-based access control
 * - If user is driver/conductor (isDriverOrConductor), only allow /bookings
 * - Otherwise redirect to /bookings (for drivers) or allow admin full access
 */
const ProtectedRoute = ({ children, requiredRoute = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is a driver or conductor, only allow access to /bookings
  if (user?.accountDetails?.isDriverOrConductor) {
    // If requiredRoute is specified and doesn't match /bookings, deny access
    if (requiredRoute && requiredRoute !== "/bookings") {
      return <Navigate to="/bookings" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
