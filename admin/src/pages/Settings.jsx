import { useNavigate } from "react-router-dom";
import {
  Key,
  Building2,
  Users,
  ArrowRight,
} from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();

  const settingsOptions = [
    {
      id: "credentials",
      title: "Change Credentials",
      description: "Update admin username and password",
      icon: Key,
      color: "blue",
      path: "/settings/credentials",
    },
    {
      id: "business-info",
      title: "Business Info",
      description: "Manage company information and details",
      icon: Building2,
      color: "green",
      path: "/settings/business-info",
    },
    {
      id: "manage-roles",
      title: "Manage Roles",
      description: "Configure user roles and permissions",
      icon: Users,
      color: "purple",
      path: "/settings/manage-roles",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-100",
        icon: "text-blue-600",
        hover: "hover:bg-blue-50",
        border: "border-blue-200",
      },
      green: {
        bg: "bg-green-100",
        icon: "text-green-600",
        hover: "hover:bg-green-50",
        border: "border-green-200",
      },
      purple: {
        bg: "bg-purple-100",
        icon: "text-purple-600",
        hover: "hover:bg-purple-50",
        border: "border-purple-200",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage system settings and configurations
        </p>
      </div>

      {/* Settings Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsOptions.map((option) => {
          const Icon = option.icon;
          const colorClasses = getColorClasses(option.color);

          return (
            <button
              key={option.id}
              onClick={() => navigate(option.path)}
              className={`bg-white rounded-xl shadow-sm border ${colorClasses.border} p-6 text-left transition-all ${colorClasses.hover} hover:shadow-md group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-3 rounded-lg ${colorClasses.bg} flex-shrink-0`}
                  >
                    <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {option.description}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className={`h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-4`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;
