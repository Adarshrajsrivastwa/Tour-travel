import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { deleteDriver } from "../api/driver";

const ViewDriver = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const driverData = location.state?.driverData;

  const [showDocuments, setShowDocuments] = useState({
    aadharFront: false,
    aadharBack: false,
    panCard: false,
    drivingLicense: false,
    profileImage: false,
  });

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!driverData) {
      navigate("/drivers");
    }
  }, [driverData, navigate]);

  if (!driverData) {
    return null;
  }

  const getDocumentStatus = (driver) => {
    const hasAadhar = driver.aadharFront && driver.aadharBack;
    const hasPAN = driver.panCard;
    const hasLicense = driver.drivingLicense;

    if (hasAadhar && hasPAN && hasLicense) {
      return { status: "Complete", color: "green", icon: CheckCircle };
    } else if (hasAadhar || hasPAN || hasLicense) {
      return { status: "Partial", color: "yellow", icon: AlertCircle };
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

  const handleDeleteDriver = async () => {
    if (!driverData?._id) {
      alert("Driver ID not found");
      return;
    }

    if (
      window.confirm(
        "Are you sure you want to delete this driver/conductor? This action cannot be undone."
      )
    ) {
      setIsDeleting(true);
      try {
        await deleteDriver(driverData._id);
        alert("Driver deleted successfully!");
        navigate("/drivers");
      } catch (error) {
        console.error("Delete driver error:", error);
        alert(
          error.response?.data?.message || 
          "Failed to delete driver. Please try again."
        );
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const downloadDocument = (documentType) => {
    const documentPath = driverData[documentType];
    
    console.log(`🔍 Download Debug for ${documentType}:`);
    console.log(`  - Document path:`, documentPath);
    console.log(`  - Driver data:`, driverData);
    
    if (!documentPath) {
      console.log(`❌ No document path found for ${documentType}`);
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
      console.log(`☁️ Using Cloudinary URL:`, documentUrl);
    } else {
      // It's a local file path, construct the backend URL
      const backendUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
      documentUrl = `${backendUrl}${documentPath}`;
      console.log(`📁 Using local file URL:`, documentUrl);
      console.log(`  - Backend URL:`, backendUrl);
      console.log(`  - Document path:`, documentPath);
    }

    // Extract filename from URL or use document type as filename
    const filename = documentPath.split('/').pop() || `${documentType}.${documentPath.split('.').pop() || 'pdf'}`;
    console.log(`📄 Filename:`, filename);
    
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
          
          console.log(`🔗 Cloudinary blob link created:`, {
            href: link.href,
            download: link.download
          });
          
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
      link.target = '_blank'; // Open in new tab as fallback
      
      console.log(`🔗 Local file link created:`, {
        href: link.href,
        download: link.download,
        target: link.target
      });
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      console.log(`👆 Clicking download link...`);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ Local file download initiated: ${filename}`);
    }
    
    console.log(`✅ Download initiated for ${documentType}: ${filename}`);
    console.log(`🌐 Full URL: ${documentUrl}`);
  };

  const docStatus = getDocumentStatus(driverData);
  const StatusIcon = docStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/drivers")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Driver Management
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Driver/Conductor Details
              </h1>
              <p className="text-gray-600 mt-1">
                View complete information and documents
              </p>
            </div>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() =>
                  navigate("/add-driver", {
                    state: { isEdit: true, driverData: driverData },
                  })
                }
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDeleteDriver}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                  isDeleting
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="shrink-0">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  {driverData.profileImage ? (
                    <img
                      src={driverData.profileImage}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {driverData.fullName}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      driverData.jobTitle === "Driver"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {driverData.jobTitle}
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
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {driverData.mobile}
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {driverData.email}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {driverData.yearsOfExperience} years experience
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Full Name
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.fullName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Job Title
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.jobTitle}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Father's Name
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.fathersName || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Mother's Name
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.mothersName || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Date of Birth
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(driverData.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Years of Experience
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.yearsOfExperience} years
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Handicapped
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      driverData.handicapped
                        ? "bg-orange-100 text-orange-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {driverData.handicapped ? "Yes" : "No"}
                  </span>
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">
                  Permanent Address
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.permanentAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Mobile Number
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.mobile}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Alternate Mobile
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.alternateMobile || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email Address
                </label>
                <p className="text-sm text-gray-900 mt-1">{driverData.email}</p>
              </div>
            </div>
          </div>

          {/* Document Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Aadhar Number
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.aadharNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  PAN Number
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.panNumber}
                </p>
              </div>
            </div>

            {/* Document Files */}
            <div className="mt-6 space-y-4">
              <h4 className="text-md font-medium text-gray-900">
                Uploaded Documents
              </h4>

              <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aadhar Front */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Aadhar Card - Front
                        </p>
                        <p className="text-sm text-gray-500">
                          {driverData.aadharFront
                            ? "Document uploaded"
                            : "No document uploaded"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {driverData.aadharFront && (
                        <>
                          <button
                            onClick={() => toggleDocumentView("aadharFront")}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {showDocuments.aadharFront ? (
                              <EyeOff className="h-4 w-4 mr-1" />
                            ) : (
                              <Eye className="h-4 w-4 mr-1" />
                            )}
                            {showDocuments.aadharFront ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => downloadDocument("aadharFront")}
                            className="text-green-600 hover:text-green-800 text-sm flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {showDocuments.aadharFront && driverData.aadharFront && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={driverData.aadharFront}
                        alt="Aadhar Front"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Aadhar Back */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Aadhar Card - Back
                        </p>
                        <p className="text-sm text-gray-500">
                          {driverData.aadharBack
                            ? "Document uploaded"
                            : "No document uploaded"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {driverData.aadharBack && (
                        <>
                          <button
                            onClick={() => toggleDocumentView("aadharBack")}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {showDocuments.aadharBack ? (
                              <EyeOff className="h-4 w-4 mr-1" />
                            ) : (
                              <Eye className="h-4 w-4 mr-1" />
                            )}
                            {showDocuments.aadharBack ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => downloadDocument("aadharBack")}
                            className="text-green-600 hover:text-green-800 text-sm flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {showDocuments.aadharBack && driverData.aadharBack && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={driverData.aadharBack}
                        alt="Aadhar Back"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>

                {/* PAN Card */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          PAN Card
                        </p>
                        <p className="text-sm text-gray-500">
                          {driverData.panCard
                            ? "Document uploaded"
                            : "No document uploaded"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {driverData.panCard && (
                        <>
                          <button
                            onClick={() => toggleDocumentView("panCard")}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {showDocuments.panCard ? (
                              <EyeOff className="h-4 w-4 mr-1" />
                            ) : (
                              <Eye className="h-4 w-4 mr-1" />
                            )}
                            {showDocuments.panCard ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => downloadDocument("panCard")}
                            className="text-green-600 hover:text-green-800 text-sm flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {showDocuments.panCard && driverData.panCard && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={driverData.panCard}
                        alt="PAN Card"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Driving License */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Driving License
                        </p>
                        <p className="text-sm text-gray-500">
                          {driverData.drivingLicense
                            ? "Document uploaded"
                            : "No document uploaded"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {driverData.drivingLicense && (
                        <>
                          <button
                            onClick={() => toggleDocumentView("drivingLicense")}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {showDocuments.drivingLicense ? (
                              <EyeOff className="h-4 w-4 mr-1" />
                            ) : (
                              <Eye className="h-4 w-4 mr-1" />
                            )}
                            {showDocuments.drivingLicense ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => downloadDocument("drivingLicense")}
                            className="text-green-600 hover:text-green-800 text-sm flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {showDocuments.drivingLicense &&
                    driverData.drivingLicense && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={driverData.drivingLicense}
                          alt="Driving License"
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Bank Account Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Bank Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Account Number
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.bankAccount.accountNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  IFSC Code
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.bankAccount.ifscCode}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Bank Name
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {driverData.bankAccount.bankName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDriver;
