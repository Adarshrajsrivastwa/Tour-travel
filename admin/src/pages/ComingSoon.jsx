import { useState } from 'react';
import { 
  Construction, 
  Clock, 
  ArrowLeft, 
  Home,
  Users,
  Bus,
  Route,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComingSoon = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const quickLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Home, color: 'blue' },
    { name: 'Users', path: '/users', icon: Users, color: 'green' },
    { name: 'Drivers', path: '/drivers', icon: Users, color: 'purple' },
    { name: 'Buses', path: '/buses', icon: Bus, color: 'orange' },
    { name: 'Routes', path: '/routes', icon: Route, color: 'indigo' },
    { name: 'Onboard', path: '/onboard', icon: Calendar, color: 'pink' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-4">
              <Construction className="h-10 w-10 text-orange-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-6">
            This functionality will be implemented soon. We're working hard to bring you the best experience.
          </p>

          {/* Current Time */}
          <div className="flex items-center justify-center mb-8">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">
              {currentTime.toLocaleString()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleGoBack}
              className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
            <button
              onClick={handleGoHome}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Available Features
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all group`}
                >
                  <div className={`p-2 rounded-lg bg-${link.color}-100 group-hover:bg-${link.color}-200 transition-colors`}>
                    <Icon className={`h-5 w-5 text-${link.color}-600`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {link.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Thank you for your patience. We'll notify you when this feature is ready!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
