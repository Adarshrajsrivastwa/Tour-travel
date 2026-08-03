import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Bus,
  Route,
  Calendar,
  BookOpen,
  Star,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Database,
} from "lucide-react";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "User Management", href: "/users", icon: Users },
    { name: "Driver & Conductor", href: "/drivers", icon: UserCheck },
    { name: "Bus Management", href: "/buses", icon: Bus },
    { name: "Route Management", href: "/routes", icon: Route },
    { name: "Bus Onboard", href: "/onboard", icon: Calendar },
    { name: "Booking Management", href: "/bookings", icon: BookOpen },
    { name: "Rating Management", href: "/ratings", icon: Star },
    { name: "Track Bus (GPS)", href: "/track", icon: MapPin },
    { name: "Analytics & Reports", href: "/analytics", icon: BarChart3 },
    // { name: "Seed Data", href: "/seed-data", icon: Database },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Filter navigation based on user permissions
  // Driver/Conductor (marked as isDriverOrConductor) can only see Booking Management
  const filteredNavigation = navigation.filter((item) => {
    // If user is driver/conductor, only allow booking management
    if (user?.accountDetails?.isDriverOrConductor) {
      return item.href === "/bookings";
    }
    // Admin can see all items
    return true;
  });

  const isActive = (href) => {
    // Check for exact match first
    if (location.pathname === href) {
      return true;
    }

    // Check for sub-routes (e.g., /users/123 should highlight /users)
    if (location.pathname.startsWith(href + "/")) {
      return true;
    }

    // Special case for dashboard - only match exact path
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-2 border-b border-gray-200 shrink-0">
          <div className="flex items-center">
            <div className="p-2 rounded-lg w-22 h-16">
              <img
                src="/logo.png"
                alt="GR Tour & Travel Logo"
                srcSet="/logo.png"
                className="h-full w-full"
              />
            </div>
            <span className="ml-1 text-lg font-bold text-gray-900">
              GR Tour & Travel
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation - scrollable if needed */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout button - fixed at bottom */}
        <div className="shrink-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden lg:block">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {filteredNavigation.find((item) => isActive(item.href))
                    ?.name || "Dashboard"}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-full">
          <div className="max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
