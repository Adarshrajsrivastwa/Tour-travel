import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Route,
  Bus,
  X,
  Loader2
} from 'lucide-react';
import { fetchRoutes, deleteRoute } from '../api/route';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const RouteManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search term
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const queryClient = useQueryClient();

  const routesQuery = useQuery({
    queryKey: ['routes', { page, limit, search: debouncedSearch || '' }],
    queryFn: async () => {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      return await fetchRoutes(params);
    },
    keepPreviousData: true
  });

  const routes = routesQuery.data?.data || [];
  const totalPages = routesQuery.data?.pagination?.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: async (routeId) => {
      setDeletingId(routeId);
      return await deleteRoute(routeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: () => {},
    onSettled: () => {
      setDeletingId(null);
    }
  });

  const handleViewRoute = (route) => {
    navigate('/view-route', { state: { routeId: route._id } });
  };

  const handleEditRoute = (route) => {
    navigate('/add-route', { state: { isEdit: true, routeData: route } });
  };

  const handleAddRoute = () => {
    navigate('/add-route');
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    try {
      await deleteMutation.mutateAsync(routeId);
    } catch (e) {
      alert('Failed to delete route');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Management</h1>
          <p className="text-gray-600 mt-1">Configure routes and stops for buses</p>
        </div>
        <button
          onClick={handleAddRoute}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Route
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Stop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Stop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {routesQuery.isLoading && (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500" colSpan={5}>
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                      <span>Loading routes...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!routesQuery.isLoading && routes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Bus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No routes found</p>
                    </div>
                  </td>
                </tr>
              )}
              {routes.map((route) => (
                <tr key={route._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-green-100 rounded-full p-2">
                        <Bus className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{route.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{route.startPoint}</div>
                    <div className="text-sm text-gray-500">Starting point</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{route.stops && route.stops[route.stops.length - 1]?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Final destination</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{route.totalDistance} km</div>
                    <div className="text-sm text-gray-500">{(route.estimatedTravelTime / 60).toFixed(2)} hours</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewRoute(route)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditRoute(route)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Edit Route"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoute(route._id)}
                        disabled={deletingId === route._id}
                        className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                        title="Delete Route"
                      >
                        {deletingId === route._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">Page {page} of {totalPages}</div>
            <div className="flex items-center space-x-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">Previous</button>
              <button disabled className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">{page}</button>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RouteManagement;
