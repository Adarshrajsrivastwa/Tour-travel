import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bus,
  FileText,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Image,
  Camera,
  Loader2,
  Grid,
} from "lucide-react";
import { getBusById, deleteBus, getBusTrips, updateBusStatus } from "../api/bus";
import SeatMapEditor from "../components/SeatMapEditor";

const ViewBus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const busDataFromState = location.state?.busData;

  const [showDocuments, setShowDocuments] = useState({
    rcDocument: false,
    pollutionCertificate: false,
    insuranceCertificate: false,
  });

  const [showImages, setShowImages] = useState({
    front: false,
    rear: false,
    left: false,
    right: false,
  });


  // Fetch bus data using API
  const {
    data: busResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bus", id],
    queryFn: () => getBusById(id),
    enabled: !!id, // Always fetch if we have an ID
  });

  // Delete bus mutation
  const deleteBusMutation = useMutation({
    mutationFn: deleteBus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      alert("Bus deleted successfully!");
      navigate("/buses");
    },
    onError: (error) => {
      console.error("Delete bus error:", error);
      alert(
        error.response?.data?.message ||
        "Failed to delete bus. Please try again."
      );
    },
  });

  // Use data from API (preferred) or state (fallback)
  const busData = busResponse?.data?.data || busDataFromState;

  // Fetch bus trips
  const {
    data: tripsResponse,
    isLoading: tripsLoading,
    error: tripsError
  } = useQuery({
    queryKey: ["bus-trips", id],
    queryFn: () => getBusTrips(id),
    enabled: !!id && !!busData,
  });

  // Update bus status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ busId, status }) => updateBusStatus(busId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus", id] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      alert("Bus status updated successfully!");
    },
    onError: (error) => {
      console.error("Update status error:", error);
      alert(
        error.response?.data?.message ||
        "Failed to update bus status. Please try again."
      );
    },
  });


  // Debug logging
  console.log('ViewBus - ID:', id);
  console.log('ViewBus - BusData from state:', busDataFromState);
  console.log('ViewBus - BusData from API:', busResponse?.data?.data);
  console.log('ViewBus - Final busData:', busData);
  console.log('ViewBus - isLoading:', isLoading);
  console.log('ViewBus - error:', error);

  useEffect(() => {
    if (!id && !busDataFromState) {
      navigate("/buses");
    }
  }, [id, busDataFromState, navigate]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading bus details...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    console.error('ViewBus API Error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600 mb-2">
            {error.response?.data?.message || "Failed to load bus details"}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Error: {error.message}
          </p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/buses")}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Buses
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle no data
  if (!busData) {
    console.log('ViewBus - No bus data available');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-yellow-600" />
          <p className="text-gray-600 mb-2">Bus not found</p>
          <p className="text-sm text-gray-500 mb-4">
            Bus ID: {id}
          </p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/buses")}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Buses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getDocumentStatus = (bus) => {
    const hasRC = !!bus.rcDocument;
    const hasPollution = !!bus.pollutionCertificate;
    const hasInsurance = !!bus.insuranceCertificate;
    
    // Handle both nested busImages and individual image fields
    let hasImages = false;
    if (bus.busImages && typeof bus.busImages === 'object') {
      hasImages = Object.values(bus.busImages).some((img) => img);
    } else {
      // Check individual image fields
      hasImages = !!(bus.frontImage || bus.rearImage || bus.leftImage || bus.rightImage);
    }

    const docCount = [hasRC, hasPollution, hasInsurance, hasImages].filter(
      Boolean
    ).length;

    if (docCount === 4) {
      return { status: "Complete", color: "green", icon: CheckCircle };
    } else if (docCount >= 2) {
      return { status: "Partial", color: "yellow", icon: AlertTriangle };
    } else {
      return { status: "Missing", color: "red", icon: XCircle };
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

  const toggleDocumentView = (documentType) => {
    setShowDocuments((prev) => ({
      ...prev,
      [documentType]: !prev[documentType],
    }));
  };

  const toggleImageView = (imageType) => {
    setShowImages((prev) => ({
      ...prev,
      [imageType]: !prev[imageType],
    }));
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

  const downloadDocument = (documentType) => {
    const documentPath = busData[documentType];
    
    if (!documentPath) {
      alert('No document available for download');
      return;
    }

    // Construct the full URL for the uploaded file
    // If it's already a full URL (Cloudinary), use it as is
    // If it's a local path, construct the backend URL
    let documentUrl;
    if (documentPath.startsWith('http')) {
      // It's a Cloudinary URL
      documentUrl = documentPath;
    } else {
      // It's a local file path, construct the backend URL
      const backendUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
      documentUrl = `${backendUrl}${documentPath}`;
    }

    console.log(`Downloading ${documentType} from:`, documentUrl);
    
    // Extract filename from URL or use document type as filename
    const filename = documentPath.split('/').pop() || `${documentType}.${documentPath.split('.').pop() || 'pdf'}`;
    
    // For Cloudinary URLs, we need to fetch the file and create a blob for download
    if (documentUrl.startsWith('http') && documentUrl.includes('cloudinary.com')) {
      console.log(`☁️ Handling Cloudinary download...`);
      
      // Fetch the image as a blob
      fetch(documentUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create a blob URL
          const blobUrl = URL.createObjectURL(blob);
          
          // Create download link
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          
          console.log(`✅ Cloudinary download completed: ${filename}`);
        })
        .catch(error => {
          console.error(`❌ Cloudinary download failed:`, error);
          alert(`Download failed: ${error.message}`);
        });
    } else {
      // For local files, use direct download
      console.log(`📁 Handling local file download...`);
      
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = filename;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ Local file download initiated: ${filename}`);
    }
  };

  const downloadImage = (imageType) => {
    // Handle both nested busImages and individual image fields
    let imagePath;
    if (busData.busImages && busData.busImages[imageType]) {
      imagePath = busData.busImages[imageType];
    } else if (busData[`${imageType}Image`]) {
      imagePath = busData[`${imageType}Image`];
    }
    
    if (!imagePath) {
      alert('No image available for download');
      return;
    }

    // Construct the full URL for the uploaded file
    // If it's already a full URL (Cloudinary), use it as is
    // If it's a local path, construct the backend URL
    let imageUrl;
    if (imagePath.startsWith('http')) {
      // It's a Cloudinary URL
      imageUrl = imagePath;
    } else {
      // It's a local file path, construct the backend URL
      const backendUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
      imageUrl = `${backendUrl}${imagePath}`;
    }

    console.log(`Downloading ${imageType} image from:`, imageUrl);
    
    // Extract filename from URL or use image type as filename
    const filename = imagePath.split('/').pop() || `${imageType}.${imagePath.split('.').pop() || 'jpg'}`;
    
    // For Cloudinary URLs, we need to fetch the file and create a blob for download
    if (imageUrl.startsWith('http') && imageUrl.includes('cloudinary.com')) {
      console.log(`☁️ Handling Cloudinary image download...`);
      
      // Fetch the image as a blob
      fetch(imageUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create a blob URL
          const blobUrl = URL.createObjectURL(blob);
          
          // Create download link
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          
          console.log(`✅ Cloudinary image download completed: ${filename}`);
        })
        .catch(error => {
          console.error(`❌ Cloudinary image download failed:`, error);
          alert(`Download failed: ${error.message}`);
        });
    } else {
      // For local files, use direct download
      console.log(`📁 Handling local image download...`);
      
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ Local image download initiated: ${filename}`);
    }
  };

  const docStatus = getDocumentStatus(busData);
  const StatusIcon = docStatus.icon;

  // Handle status update
  const handleStatusUpdate = (newStatus) => {
    if (window.confirm(`Are you sure you want to change the bus status to ${newStatus}?`)) {
      updateStatusMutation.mutate({ busId: id, status: newStatus });
    }
  };


  // Get trips data
  const trips = tripsResponse?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/buses")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Bus Management
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bus Details</h1>
              <p className="text-gray-600 mt-1">
                View complete bus information and documents
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  navigate("/add-bus", {
                    state: { isEdit: true, busData: busData },
                  })
                }
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this bus? This action cannot be undone."
                    )
                  ) {
                    deleteBusMutation.mutate(busData._id);
                  }
                }}
                disabled={deleteBusMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteBusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bus Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="shrink-0">
                {busData.busImages?.front || busData.frontImage ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                    <img
                      src={getFullImageUrl(busData.busImages?.front || busData.frontImage)}
                      alt={`${busData.busName} front view`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center" style={{ display: 'none' }}>
                      <Bus className="h-10 w-10 text-blue-600" />
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bus className="h-10 w-10 text-blue-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {busData.busName}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      busData.status
                    )}`}
                  >
                    {busData.status}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      docStatus.status
                    )}`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {docStatus.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Bus className="h-4 w-4 mr-2 text-gray-400" />
                    {busData.busNumber}
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">Capacity:</span>
                    <span className="ml-1">{busData.seatCapacity} seats</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">Layout:</span>
                    <span className="ml-1">{busData.seatArchitecture}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bus className="h-5 w-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Bus Name
                </label>
                <p className="text-sm text-gray-900">{busData.busName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Bus Number
                </label>
                <p className="text-sm text-gray-900">{busData.busNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Seat Architecture
                </label>
                <p className="text-sm text-gray-900">
                  {busData.seatArchitecture || 'Custom Layout'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Seat Capacity
                </label>
                <p className="text-sm text-gray-900">
                  {busData.seatCapacity} seats
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Type
                </label>
                <p className="text-sm text-gray-900">
                  {busData.acType || 'AC'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <p className="text-sm text-gray-900">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      busData.status
                    )}`}
                  >
                    {busData.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Insurance Number
                </label>
                <p className="text-sm text-gray-900">
                  {busData.insuranceNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {busData.createdAt ? new Date(busData.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Last Updated
                </label>
                <p className="text-sm text-gray-900">
                  {busData.updatedAt ? new Date(busData.updatedAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Seat Layout View */}
          {busData.seatLayout && (busData.seatLayout.rows || busData.seatLayout.map?.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Grid className="h-5 w-5 mr-2" />
                Seat Layout
              </h3>
              <SeatMapEditor
                value={busData.seatLayout}
                onChange={() => {}} // No-op for read-only
                readOnly={true}
              />
            </div>
          )}

          {/* Document Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Information
            </h3>

            {/* Documents */}
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
              {/* RC Document */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        RC Document
                      </p>
                      <p className="text-sm text-gray-500">
                        {busData.rcDocument
                          ? "Document uploaded"
                          : "No document uploaded"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {busData.rcDocument ? (
                      <>
                        <button
                          onClick={() => toggleDocumentView("rcDocument")}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          {showDocuments.rcDocument ? (
                            <EyeOff className="h-4 w-4 mr-1" />
                          ) : (
                            <Eye className="h-4 w-4 mr-1" />
                          )}
                          {showDocuments.rcDocument ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() => downloadDocument("rcDocument")}
                          className="text-green-600 hover:text-green-800 text-sm flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </>
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {showDocuments.rcDocument && busData.rcDocument && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={getFullImageUrl(busData.rcDocument)}
                      alt="RC Document"
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}
              </div>

              {/* Pollution Certificate */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Pollution Certificate
                      </p>
                      <p className="text-sm text-gray-500">
                        {busData.pollutionCertificate
                          ? "Document uploaded"
                          : "No document uploaded"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {busData.pollutionCertificate ? (
                      <>
                        <button
                          onClick={() =>
                            toggleDocumentView("pollutionCertificate")
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          {showDocuments.pollutionCertificate ? (
                            <EyeOff className="h-4 w-4 mr-1" />
                          ) : (
                            <Eye className="h-4 w-4 mr-1" />
                          )}
                          {showDocuments.pollutionCertificate ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() =>
                            downloadDocument("pollutionCertificate")
                          }
                          className="text-green-600 hover:text-green-800 text-sm flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </>
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {showDocuments.pollutionCertificate &&
                  busData.pollutionCertificate && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={getFullImageUrl(busData.pollutionCertificate)}
                        alt="Pollution Certificate"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
              </div>

              {/* Insurance Certificate */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Insurance Certificate
                      </p>
                      <p className="text-sm text-gray-500">
                        {busData.insuranceCertificate
                          ? "Document uploaded"
                          : "No document uploaded"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {busData.insuranceCertificate ? (
                      <>
                        <button
                          onClick={() =>
                            toggleDocumentView("insuranceCertificate")
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          {showDocuments.insuranceCertificate ? (
                            <EyeOff className="h-4 w-4 mr-1" />
                          ) : (
                            <Eye className="h-4 w-4 mr-1" />
                          )}
                          {showDocuments.insuranceCertificate ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() =>
                            downloadDocument("insuranceCertificate")
                          }
                          className="text-green-600 hover:text-green-800 text-sm flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </>
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {showDocuments.insuranceCertificate &&
                  busData.insuranceCertificate && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={getFullImageUrl(busData.insuranceCertificate)}
                        alt="Insurance Certificate"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
              </div>
            </div>

            {/* Insurance Number */}
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-500">
                Insurance Number
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {busData.insuranceNumber}
              </p>
            </div>
          </div>

          {/* Bus Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Bus Images
            </h3>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
              {(() => {
                // Handle both nested busImages and individual image fields
                let imagesToDisplay = {};
                if (busData.busImages && typeof busData.busImages === 'object') {
                  imagesToDisplay = busData.busImages;
                } else {
                  // Convert individual image fields to the expected format
                  imagesToDisplay = {
                    front: busData.frontImage,
                    rear: busData.rearImage,
                    left: busData.leftImage,
                    right: busData.rightImage
                  };
                }
                return Object.entries(imagesToDisplay);
              })().map(([view, image]) => (
                <div key={view} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Image className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {view} View
                        </p>
                        <p className="text-sm text-gray-500">
                          {image ? "Image uploaded" : "No image uploaded"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {image ? (
                        <>
                          <button
                            onClick={() => toggleImageView(view)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {showImages[view] ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => downloadImage(view)}
                            className="text-green-600 hover:text-green-800 text-sm flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </>
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {image && showImages[view] && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={getFullImageUrl(image)}
                        alt={`${view} view`}
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


          {/* Bus Trips */}
          {trips.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Bus className="h-5 w-5 mr-2" />
                Assigned Trips
              </h3>
              <div className="space-y-3">
                {trips.map((trip, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {trip.routeId?.name || 'Unknown Route'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {trip.startPoint} → {trip.endPoint}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">
                          {new Date(trip.departureTime).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(trip.departureTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance History */}
          {busData.maintenanceHistory && busData.maintenanceHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Maintenance History
              </h3>
              <div className="space-y-4">
                {busData.maintenanceHistory.map((maintenance, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {maintenance.description}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(maintenance.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Cost:</span> ₹{maintenance.cost || 0}
                      </div>
                      {maintenance.nextMaintenanceDate && (
                        <div>
                          <span className="font-medium">Next Service:</span> {new Date(maintenance.nextMaintenanceDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewBus;
