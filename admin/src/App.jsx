import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import ViewUser from "./pages/ViewUser";
import DriverManagement from "./pages/DriverManagement";
import AddDriverForm from "./pages/AddDriverForm";
import ViewDriver from "./pages/ViewDriver";
import BusManagement from "./pages/BusManagement";
import AddBusForm from "./pages/AddBusForm";
import ViewBus from "./pages/ViewBus";
import RouteManagement from "./pages/RouteManagement";
import AddRouteForm from "./pages/AddRouteForm";
import ViewRoute from "./pages/ViewRoute";
import OnboardManagement from "./pages/OnboardManagement";
import AddOnboardForm from "./pages/AddOnboardForm";
import ViewOnboard from "./pages/ViewOnboard";
import BookingManagement from "./pages/BookingManagement";
import ViewBooking from "./pages/ViewBooking";
import RatingsManagement from "./pages/RatingsManagement";
import ViewRating from "./pages/ViewRating";
import Analytics from "./pages/Analytics";
import ViewAnalytics from "./pages/ViewAnalytics";
import ComingSoon from "./pages/ComingSoon";
import Settings from "./pages/Settings";
import ChangeCredentials from "./pages/ChangeCredentials";
import BusinessInfo from "./pages/BusinessInfo";
import ManageRoles from "./pages/ManageRoles";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is driver/conductor (admin for bookings only), redirect to bookings
  if (user.userType === "Admin" && user?.accountDetails?.isDriverOrConductor) {
    return <Navigate to="/bookings" replace />;
  }

  if (user.userType !== "Admin") {
    return <Navigate to="/bookings" replace />;
  }

  return children;
};

const DriverConductorRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow full admin OR driver/conductor with bookings permission
  const isDriver = user?.accountDetails?.isDriverOrConductor;
  const hasBookingAccess = user?.accountDetails?.permissions?.bookings;

  if (!user.userType === "Admin" && (!isDriver || !hasBookingAccess)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is logged in, redirect based on their role
  if (user) {
    // Driver/Conductor should go to bookings, full admin goes to dashboard
    if (user?.accountDetails?.isDriverOrConductor) {
      return <Navigate to="/bookings" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Root redirect component - redirects based on user role
const RootRedirect = () => {
  const { user } = useAuth();

  // Driver/Conductor should go to bookings, full admin goes to dashboard
  if (user?.accountDetails?.isDriverOrConductor) {
    return <Navigate to="/bookings" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking token on app start
    const token = localStorage.getItem("token");
    if (token) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/view-user"
              element={
                <AdminRoute>
                  <Layout>
                    <ViewUser />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <AdminRoute>
                  <Layout>
                    <DriverManagement />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/add-driver"
              element={
                <AdminRoute>
                  <Layout>
                    <AddDriverForm />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/view-driver"
              element={
                <AdminRoute>
                  <Layout>
                    <ViewDriver />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/buses"
              element={
                <AdminRoute>
                  <Layout>
                    <BusManagement />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/add-bus"
              element={
                <AdminRoute>
                  <Layout>
                    <AddBusForm />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/view-bus/:id"
              element={
                <AdminRoute>
                  <Layout>
                    <ViewBus />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/routes"
              element={
                <AdminRoute>
                  <Layout>
                    <RouteManagement />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/add-route"
              element={
                <AdminRoute>
                  <Layout>
                    <AddRouteForm />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/view-route"
              element={
                <AdminRoute>
                  <Layout>
                    <ViewRoute />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/onboard"
              element={
                <AdminRoute>
                  <Layout>
                    <OnboardManagement />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/add-onboard"
              element={
                <AdminRoute>
                  <Layout>
                    <AddOnboardForm />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/view-onboard"
              element={
                <AdminRoute>
                  <Layout>
                    <ViewOnboard />
                  </Layout>
                </AdminRoute>
              }
            />

            {/* Bookings */}
            <Route
              path="/bookings"
              element={
                <DriverConductorRoute>
                  <Layout>
                    <BookingManagement />
                  </Layout>
                </DriverConductorRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <DriverConductorRoute>
                  <Layout>
                    <ViewBooking />
                  </Layout>
                </DriverConductorRoute>
              }
            />

            {/* Ratings */}
            <Route
              path="/ratings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RatingsManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ratings/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ViewRating />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Analytics */}
            <Route
              path="/analytics"
              element={
                <AdminRoute>
                  <Layout>
                    <Analytics />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/analytics/:id"
              element={
                <AdminRoute>
                  <Layout>
                    <ViewAnalytics />
                  </Layout>
                </AdminRoute>
              }
            />

            <Route
              path="/track"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ComingSoon />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/settings/credentials"
              element={
                <AdminRoute>
                  <Layout>
                    <ChangeCredentials />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/settings/business-info"
              element={
                <AdminRoute>
                  <Layout>
                    <BusinessInfo />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/settings/manage-roles"
              element={
                <AdminRoute>
                  <Layout>
                    <ManageRoles />
                  </Layout>
                </AdminRoute>
              }
            />

            {/* Default redirect - checks user role */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RootRedirect />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
