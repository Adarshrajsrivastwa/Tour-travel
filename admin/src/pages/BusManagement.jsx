import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Bus,
  FileText,
  Image,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Download,
} from "lucide-react";
import { getAllBuses, deleteBus } from "../api/bus";
import { exportBusReport } from "../api/export";

const BusManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType]);

  // Fetch buses using API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "buses",
      debouncedSearchTerm,
      filterStatus,
      filterType,
      currentPage,
    ],
    queryFn: () =>
      getAllBuses({
        search: debouncedSearchTerm,
        status: filterStatus,
        acType: filterType,
        page: currentPage,
        limit: 10,
      }),
  });

  // Delete bus mutation
  const deleteBusMutation = useMutation({
    mutationFn: deleteBus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      alert("Bus deleted successfully!");
    },
    onError: (error) => {
      console.error("Delete bus error:", error);
      alert(
        error.response?.data?.message ||
          "Failed to delete bus. Please try again."
      );
    },
  });

  // Preserve focus on search input after data reload
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
        }
      }, 0);
    }
  }, [data, isSearchFocused]);

  const buses = data?.data?.data || [];
  const totalPages = data?.data?.totalPages || 1;

  const handleViewBus = (bus) => {
    console.log("Viewing bus:", bus);
    navigate(`/view-bus/${bus._id}`, { state: { busData: bus } });
  };

  const handleEditBus = (bus) => {
    navigate("/add-bus", { state: { isEdit: true, busData: bus } });
  };

  const handleAddBus = () => {
    navigate("/add-bus");
  };

  const handleExportBusReport = async () => {
    try {
      setExporting(true);
      await exportBusReport();
      alert("Bus report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err.response?.data?.message || "Failed to export report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteBus = (busId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this bus? This action cannot be undone."
      )
    ) {
      deleteBusMutation.mutate(busId);
    }
  };

  const getDocumentStatus = (bus) => {
    const hasRC = bus.rcDocument;
    const hasPollution = bus.pollutionCertificate;
    const hasInsurance = bus.insuranceCertificate;
    const hasImages = Object.values(bus.busImages).some((img) => img);

    const docCount = [hasRC, hasPollution, hasInsurance, hasImages].filter(
      Boolean
    ).length;

    if (docCount === 4) {
      return { status: "Complete", color: "green" };
    } else if (docCount >= 2) {
      return { status: "Partial", color: "yellow" };
    } else {
      return { status: "Missing", color: "red" };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Complete":
        return "bg-green-100 text-green-800";
      case "Partial":
        return "bg-yellow-100 text-yellow-800";
      case "Missing":
        return "bg-red-100 text-red-800";
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
    
    const apiUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const baseUrl = apiUrl.replace(/\/api\/?$/, "");
    
    let formattedPath = imagePath.replace(/\\/g, "/");
    if (!formattedPath.startsWith("/")) {
      formattedPath = "/" + formattedPath;
    }
    
    return `${baseUrl}${formattedPath}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bus Management</h1>
          <p className="text-gray-600 mt-1">
            Manage GR Tour & Travel buses and their documents
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={handleExportBusReport}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export Report"}
          </button>
          <button
            onClick={handleAddBus}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Bus
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by bus name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
          </div>

          {/* Filter by status */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Filter by type */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Buses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bus Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bus Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-gray-600">Loading buses...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="text-red-600">
                      <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                      <p>Failed to load buses. Please try again.</p>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : buses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Bus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No buses found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                buses.map((bus) => {
                  const docStatus = getDocumentStatus(bus);

                  // Get front image - handle both nested busImages and individual fields
                  const getFrontImage = (bus) => {
                    if (bus.busImages && bus.busImages.front) {
                      return bus.busImages.front;
                    } else if (bus.frontImage) {
                      return bus.frontImage;
                    }
                    return null;
                  };

                  const frontImage = getFrontImage(bus);

                  return (
                    <tr key={bus._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {frontImage ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                              <img
                                src={getFullImageUrl(frontImage)}
                                alt={`${bus.busName} front view`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                              <div
                                className="w-full h-full bg-blue-100 flex items-center justify-center"
                                style={{ display: "none" }}
                              >
                                <Bus className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Bus className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {bus.busName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {bus.busNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {bus.seatCapacity} seats
                        </div>
                        <div className="text-sm text-gray-500">
                          {bus.seatArchitecture}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {bus.acType || "AC"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(() => {
                            let count = 0;
                            if (bus.rcDocument) count++;
                            if (bus.pollutionCertificate) count++;
                            if (bus.insuranceCertificate) count++;
                            if (
                              Object.values(bus.busImages || {}).some(
                                (img) => img
                              )
                            )
                              count++;
                            return count;
                          })()}{" "}
                          / 4 documents
                        </div>
                        <div className="text-sm text-gray-500">
                          {docStatus.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            bus.status
                          )}`}
                        >
                          {bus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewBus(bus)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditBus(bus)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Edit Bus"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBus(bus._id)}
                            disabled={deleteBusMutation.isPending}
                            className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Bus"
                          >
                            {deleteBusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {buses.length} buses
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusManagement;
