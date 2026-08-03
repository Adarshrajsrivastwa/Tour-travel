import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
// import { mockDrivers } from '../data/mockData'; // 🔹 Commented mock data
import { useQuery } from "@tanstack/react-query";
import { getAllDriver, deleteDriver } from "../api/driver";
import { exportDriverReport } from "../api/export";

const DriverManagement = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ✅ Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = searchTerm.trim();
      setDebouncedSearchTerm(trimmedSearch);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole]);

  // ✅ Fetch drivers from API with search and filter parameters
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["drivers", debouncedSearchTerm, filterRole, currentPage],
    queryFn: () =>
      getAllDriver({
        search: debouncedSearchTerm || undefined, // Only send search if not empty
        role: filterRole,
        page: currentPage,
        limit: 10,
      }),
    enabled: true,
  });

  // ✅ Update total pages when data changes
  useEffect(() => {
    if (data?.data?.pagination) {
      setTotalPages(data.data.pagination.pages);
    }
  }, [data]);

  // ✅ Restore focus to search input after data reloads
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          // Restore cursor position to end of text
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
        }
      }, 0);
    }
  }, [data, isSearchFocused]);

  const handleViewDriver = (driver) => {
    navigate("/view-driver", { state: { driverData: driver } });
  };

  const handleEditDriver = (driver) => {
    navigate("/add-driver", { state: { isEdit: true, driverData: driver } });
  };

  const handleAddDriver = () => {
    navigate("/add-driver");
  };

  const handleExportDriverReport = async () => {
    try {
      setExporting(true);
      await exportDriverReport();
      alert("Driver report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err.response?.data?.message || "Failed to export report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this driver/conductor? This action cannot be undone."
      )
    ) {
      try {
        // Preserve focus state before deletion
        const wasFocused = document.activeElement === searchInputRef.current;

        await deleteDriver(driverId);
        // Refetch data to get updated list
        await refetch();

        // Restore focus if it was focused before
        if (wasFocused && searchInputRef.current) {
          searchInputRef.current.focus();
        }

        alert("Driver deleted successfully!");
      } catch (error) {
        console.error("Delete driver error:", error);
        alert(
          error.response?.data?.message ||
            "Failed to delete driver. Please try again."
        );
      }
    }
  };

  const getDocumentStatus = (driver) => {
    const hasAadhar = driver.aadharFront && driver.aadharBack;
    const hasPAN = driver.panCard;
    const hasLicense = driver.drivingLicense;

    if (hasAadhar && hasPAN && hasLicense) {
      return { status: "Complete", color: "green" };
    } else if (hasAadhar || hasPAN || hasLicense) {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading drivers...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">Failed to load drivers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Driver & Conductor Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage crew members and their documents
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={handleExportDriverReport}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export Report"}
          </button>
          <button
            onClick={handleAddDriver}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Driver/Conductor
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
                placeholder="Search by name, mobile, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
          </div>

          {/* Filter by role */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="Driver">Driver</option>
              <option value="Conductor">Conductor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crew Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
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
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading drivers...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-red-500"
                  >
                    Error loading drivers. Please try again.
                  </td>
                </tr>
              ) : data?.data?.data?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12">
                    <div className="w-full flex flex-col items-center justify-center text-gray-500">
                      <User className="h-12 w-12 mb-4 text-gray-300 mx-auto" />
                      <p className="text-center w-full">No drivers found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.data?.map((driver) => {
                  const docStatus = getDocumentStatus(driver);
                  return (
                    <tr key={driver._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {driver.profileImage ? (
                              <img
                                src={getFullImageUrl(driver.profileImage)}
                                alt={`${driver.fullName} profile`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full flex items-center justify-center ${
                                driver.profileImage ? "hidden" : "flex"
                              }`}
                            >
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {driver.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {driver.mobile}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {driver.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            driver.jobTitle === "Driver"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {driver.jobTitle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.yearsOfExperience} years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          let count = 0;
                          if (driver.aadharFront && driver.aadharBack) count++;
                          if (driver.panCard) count++;
                          if (driver.drivingLicense) count++;
                          return `${count} / 3 documents`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            docStatus.status
                          )}`}
                        >
                          {docStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDriver(driver)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditDriver(driver)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Edit Driver"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver._id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Pagination Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {data?.data?.data?.length || 0} of{" "}
              {data?.data?.pagination?.total || 0} drivers
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
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
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverManagement;

// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Search,
//   Filter,
//   Plus,
//   Edit,
//   Trash2,
//   Eye,
//   Phone,
//   Mail,
//   Calendar,
//   User,
//   UserCheck,
//   Download,
//   Upload,
//   FileText,
//   CreditCard,
//   Car,
//   Award,
//   AlertCircle,
//   CheckCircle,
//   X,
// } from "lucide-react";
// import { mockDrivers } from "../data/mockData";
// import { useQuery } from "@tanstack/react-query";
// import { getAllDriver } from "../api/driver";

// const DriverManagement = () => {
//   const navigate = useNavigate();
//   const [drivers, setDrivers] = useState([]);
//   const [filteredDrivers, setFilteredDrivers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterRole, setFilterRole] = useState("all");

//   const { data } = useQuery();

//   useEffect(() => {
//     setDrivers(mockDrivers);
//     setFilteredDrivers(mockDrivers);
//   }, []);

//   useEffect(() => {
//     let filtered = drivers;

//     // Search filter
//     if (searchTerm) {
//       filtered = filtered.filter(
//         (driver) =>
//           driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           driver.mobile.includes(searchTerm) ||
//           driver.email.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }

//     // Role filter
//     if (filterRole !== "all") {
//       filtered = filtered.filter((driver) => driver.jobTitle === filterRole);
//     }

//     setFilteredDrivers(filtered);
//   }, [drivers, searchTerm, filterRole]);

//   const handleViewDriver = (driver) => {
//     navigate("/view-driver", { state: { driverData: driver } });
//   };

//   const handleEditDriver = (driver) => {
//     navigate("/add-driver", { state: { isEdit: true, driverData: driver } });
//   };

//   const handleAddDriver = () => {
//     navigate("/add-driver");
//   };

//   const handleDeleteDriver = (driverId) => {
//     if (
//       window.confirm("Are you sure you want to delete this driver/conductor?")
//     ) {
//       setDrivers(drivers.filter((driver) => driver.id !== driverId));
//     }
//   };

//   const getDocumentStatus = (driver) => {
//     const hasAadhar = driver.aadharFront && driver.aadharBack;
//     const hasPAN = driver.panCard;
//     const hasLicense = driver.drivingLicense;

//     if (hasAadhar && hasPAN && hasLicense) {
//       return { status: "Complete", color: "green" };
//     } else if (hasAadhar || hasPAN || hasLicense) {
//       return { status: "Partial", color: "yellow" };
//     } else {
//       return { status: "Missing", color: "red" };
//     }
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "Complete":
//         return "bg-green-100 text-green-800";
//       case "Partial":
//         return "bg-yellow-100 text-yellow-800";
//       case "Missing":
//         return "bg-red-100 text-red-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             Driver & Conductor Management
//           </h1>
//           <p className="text-gray-600 mt-1">
//             Manage crew members and their documents
//           </p>
//         </div>
//         <button
//           onClick={handleAddDriver}
//           className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
//         >
//           <Plus className="h-5 w-5 mr-2" />
//           Add Driver/Conductor
//         </button>
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <div className="flex flex-col sm:flex-row gap-4">
//           {/* Search */}
//           <div className="flex-1">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search by name, mobile, or email..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
//               />
//             </div>
//           </div>

//           {/* Filter by role */}
//           <div className="flex items-center space-x-2">
//             <Filter className="h-4 w-4 text-gray-400" />
//             <select
//               value={filterRole}
//               onChange={(e) => setFilterRole(e.target.value)}
//               className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             >
//               <option value="all">All Roles</option>
//               <option value="Driver">Driver</option>
//               <option value="Conductor">Conductor</option>
//             </select>
//           </div>

//           {/* Export button */}
//           <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
//             <Download className="h-4 w-4 mr-2" />
//             Export
//           </button>
//         </div>
//       </div>

//       {/* Drivers Table */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50 border-b border-gray-200">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Crew Member
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Contact
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Role
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Experience
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Handicap
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Documents
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Status
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredDrivers.map((driver) => {
//                 const docStatus = getDocumentStatus(driver);
//                 return (
//                   <tr key={driver.id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="flex items-center">
//                         <div className="bg-gray-200 rounded-full p-2">
//                           <User className="h-5 w-5 text-gray-600" />
//                         </div>
//                         <div className="ml-4">
//                           <div className="text-sm font-medium text-gray-900">
//                             {driver.fullName}
//                           </div>
//                           <div className="text-sm text-gray-500">
//                             ID: {driver.id}
//                           </div>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm text-gray-900 flex items-center">
//                         <Phone className="h-4 w-4 mr-2 text-gray-400" />
//                         {driver.mobile}
//                       </div>
//                       <div className="text-sm text-gray-500 flex items-center">
//                         <Mail className="h-4 w-4 mr-2 text-gray-400" />
//                         {driver.email}
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span
//                         className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                           driver.jobTitle === "Driver"
//                             ? "bg-blue-100 text-blue-800"
//                             : "bg-green-100 text-green-800"
//                         }`}
//                       >
//                         {driver.jobTitle}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm text-gray-900">
//                         {driver.yearsOfExperience} years
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span
//                         className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                           driver.handicapped
//                             ? "bg-orange-100 text-orange-800"
//                             : "bg-green-100 text-green-800"
//                         }`}
//                       >
//                         {driver.handicapped ? "Yes" : "No"}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm text-gray-900">
//                         {(() => {
//                           let count = 0;
//                           if (driver.aadharFront && driver.aadharBack) count++;
//                           if (driver.panCard) count++;
//                           if (driver.drivingLicense) count++;
//                           return count;
//                         })()}{" "}
//                         / 3 documents
//                       </div>
//                       <div className="text-sm text-gray-500">
//                         {(() => {
//                           const hasAadhar =
//                             driver.aadharFront && driver.aadharBack;
//                           const hasPAN = driver.panCard;
//                           const hasLicense = driver.drivingLicense;
//                           if (hasAadhar && hasPAN && hasLicense)
//                             return "Complete";
//                           if (hasAadhar || hasPAN || hasLicense)
//                             return "Partial";
//                           return "Missing";
//                         })()}
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span
//                         className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
//                           docStatus.status
//                         )}`}
//                       >
//                         {docStatus.status}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                       <div className="flex items-center space-x-2">
//                         <button
//                           onClick={() => handleViewDriver(driver)}
//                           className="text-blue-600 hover:text-blue-900 p-1"
//                           title="View Details"
//                         >
//                           <Eye className="h-4 w-4" />
//                         </button>
//                         <button
//                           onClick={() => handleEditDriver(driver)}
//                           className="text-green-600 hover:text-green-900 p-1"
//                           title="Edit Driver"
//                         >
//                           <Edit className="h-4 w-4" />
//                         </button>
//                         <button
//                           onClick={() => handleDeleteDriver(driver.id)}
//                           className="text-red-600 hover:text-red-900 p-1"
//                           title="Delete Driver"
//                         >
//                           <Trash2 className="h-4 w-4" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination */}
//         <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
//           <div className="flex items-center justify-between">
//             <div className="text-sm text-gray-700">
//               Showing {filteredDrivers.length} of {drivers.length} crew members
//             </div>
//             <div className="flex items-center space-x-2">
//               <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100">
//                 Previous
//               </button>
//               <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
//                 1
//               </button>
//               <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100">
//                 Next
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DriverManagement;
