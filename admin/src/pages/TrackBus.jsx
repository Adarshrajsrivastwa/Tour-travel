import { useState, useEffect } from 'react';
import { MapPin, Bus, Route, Clock, Navigation, Play, Pause, RefreshCw } from 'lucide-react';

const TrackBus = () => {
  const [selectedBus, setSelectedBus] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const mockBuses = [
    { id: 1, name: 'City Express 1', route: 'Mumbai to Pune', status: 'On Route', location: 'Thane' },
    { id: 2, name: 'Highway Cruiser 2', route: 'Pune to Mumbai', status: 'Scheduled', location: 'Pune Station' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Track Bus (GPS)</h1>
          <p className="text-gray-600 mt-1">Real-time bus location tracking</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setIsTracking(!isTracking)}
            className={`px-4 py-2 rounded-lg flex items-center ${
              isTracking 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isTracking ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bus List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Buses</h3>
            <div className="space-y-3">
              {mockBuses.map((bus) => (
                <div
                  key={bus.id}
                  onClick={() => setSelectedBus(bus)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedBus?.id === bus.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Bus className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">{bus.name}</h4>
                        <p className="text-xs text-gray-500">{bus.route}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bus.status === 'On Route' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bus.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <MapPin className="h-3 w-3 mr-1" />
                    {bus.location}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Map</h3>
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Map integration will be implemented here</p>
                <p className="text-sm text-gray-400 mt-2">
                  {selectedBus ? `Tracking: ${selectedBus.name}` : 'Select a bus to track'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bus Details */}
      {selectedBus && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bus Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Current Location</h4>
              <p className="text-lg font-semibold text-gray-900">{selectedBus.location}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Route</h4>
              <p className="text-lg font-semibold text-gray-900">{selectedBus.route}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                selectedBus.status === 'On Route' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedBus.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackBus;
