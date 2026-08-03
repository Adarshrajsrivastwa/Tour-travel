import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  Shield,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axiosInstance from "../api/axiosInstance";

const ManageRoles = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {
      users: { view: false, create: false, edit: false, delete: false },
      drivers: { view: false, create: false, edit: false, delete: false },
      buses: { view: false, create: false, edit: false, delete: false },
      routes: { view: false, create: false, edit: false, delete: false },
      bookings: { view: false, create: false, edit: false, delete: false },
      analytics: { view: false },
      settings: { view: false, edit: false },
    },
  });

  // New state for assigning accounts to drivers/conductors
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedConductor, setSelectedConductor] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [driverFilter, setDriverFilter] = useState("");
  const [conductorFilter, setConductorFilter] = useState("");
  const [driverOpen, setDriverOpen] = useState(false);
  const [conductorOpen, setConductorOpen] = useState(false);

  // Fetch roles
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await axiosInstance.get("/admin/roles");
      return response.data;
    },
  });

  const roles = data?.data || [];

  // Fetch drivers and conductors lists (large limit so admin can choose)
  useQuery({
    queryKey: ["driversForRoles"],
    queryFn: async () => {
      const res = await axiosInstance.get("/drivers?role=Driver&limit=200");
      setDrivers(res.data.data || []);
      return res.data;
    },
  });

  useQuery({
    queryKey: ["conductorsForRoles"],
    queryFn: async () => {
      const res = await axiosInstance.get("/drivers?role=Conductor&limit=200");
      setConductors(res.data.data || []);
      return res.data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (roleData) => {
      const response = await axiosInstance.post("/admin/roles", roleData);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage("Role created successfully!");
      setShowModal(false);
      resetForm();
      refetch();
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || "Failed to create role";
      setErrors({ submit: errorMessage });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, roleData }) => {
      const response = await axiosInstance.put(`/admin/roles/${id}`, roleData);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage("Role updated successfully!");
      setShowModal(false);
      setEditingRole(null);
      resetForm();
      refetch();
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || "Failed to update role";
      setErrors({ submit: errorMessage });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axiosInstance.delete(`/admin/roles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage("Role deleted successfully!");
      refetch();
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.message || "Failed to delete role";
      setErrors({ submit: errorMessage });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: {
        users: { view: false, create: false, edit: false, delete: false },
        drivers: { view: false, create: false, edit: false, delete: false },
        buses: { view: false, create: false, edit: false, delete: false },
        routes: { view: false, create: false, edit: false, delete: false },
        bookings: { view: false, create: false, edit: false, delete: false },
        analytics: { view: false },
        settings: { view: false, edit: false },
      },
    });
    setErrors({});
  };
  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name || "",
        description: role.description || "",
        permissions: role.permissions || formData.permissions,
      });
    } else {
      setEditingRole(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (module, permission, value) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [permission]: value,
        },
      },
    }));
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    setAssigning(true);
    setErrors({});
    const payload = {
      driverId: selectedDriver || null,
      conductorId: selectedConductor || null,
      password: assignPassword,
    };
    // Validate: at least one of driver or conductor must be selected
    if (!selectedDriver && !selectedConductor) {
      setErrors({ submit: "Please select a driver, a conductor, or both." });
      setAssigning(false);
      return;
    }

    // Require a password when assigning
    if (!assignPassword || !assignPassword.trim()) {
      setErrors({ submit: "Password is required to assign an account." });
      setAssigning(false);
      return;
    }

    assignAccountMutation.mutate(payload, {
      onSettled: () => setAssigning(false),
    });
  };

  const handleToggleAll = (module, value) => {
    const modulePermissions = formData.permissions[module];
    const updatedPermissions = {};
    Object.keys(modulePermissions).forEach((perm) => {
      updatedPermissions[perm] = value;
    });
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: updatedPermissions,
      },
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Role name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole._id,
        roleData: formData,
      });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleDelete = (roleId) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const assignAccountMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.post(
        "/admin/assign-account",
        payload
      );
      return response.data;
    },
    onSuccess: (res) => {
      setSuccessMessage(res.message || "Account assigned successfully");
      setSelectedDriver("");
      setSelectedConductor("");
      setAssignPassword("");
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || "Failed to assign account";
      setErrors({ submit: errMsg });
    },
  });

  const permissionModules = [
    { key: "drivers", label: "Drivers" },
    { key: "buses", label: "Buses" },
    { key: "routes", label: "Routes" },
    { key: "bookings", label: "Bookings" },
    { key: "analytics", label: "Analytics" },
    { key: "settings", label: "Settings" },
  ];

  const getPermissionLabels = (module) => {
    if (module === "analytics") {
      return [{ key: "view", label: "View" }];
    }
    if (module === "settings") {
      return [
        { key: "view", label: "View" },
        { key: "edit", label: "Edit" },
      ];
    }
    return [
      { key: "view", label: "View" },
      { key: "create", label: "Create" },
      { key: "edit", label: "Edit" },
      { key: "delete", label: "Delete" },
    ];
  };

  // Filtered lists for searchable dropdowns
  const filteredDrivers = drivers.filter((d) => {
    const q = driverFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      (d.fullName || "").toLowerCase().includes(q) ||
      (d.mobile || "").toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q)
    );
  });

  const filteredConductors = conductors.filter((c) => {
    const q = conductorFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.fullName || "").toLowerCase().includes(q) ||
      (c.mobile || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Settings
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Manage Roles</h1>
          <p className="text-gray-600 mt-1">
            Configure user roles and permissions
          </p>
        </div>
        <div />
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <div className="shrink-0">
            <AlertCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Assign Driver/Conductor Account */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900">
          Assign Driver/Conductor Account
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Select driver or conductor, set booking permission and provide a
          password so they can log in to admin panel.
        </p>

        {errors.submit && (
          <div className="mt-4 mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{errors.submit}</p>
          </div>
        )}

        <form
          onSubmit={handleAssignSubmit}
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drivers
            </label>
            <button
              type="button"
              onClick={() => {
                setDriverOpen((s) => !s);
              }}
              className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between ${
                selectedDriver ? "bg-white" : "bg-white"
              }`}
            >
              <span
                className={`truncate ${
                  selectedDriver ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {selectedDriver
                  ? (drivers.find((x) => x._id === selectedDriver)?.fullName ||
                      "Selected") +
                    " — " +
                    (drivers.find((x) => x._id === selectedDriver)?.email ||
                      drivers.find((x) => x._id === selectedDriver)?.mobile ||
                      "")
                  : "Search drivers by name, email or mobile"}
              </span>
              <svg
                className="h-4 w-4 text-gray-500 ml-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {driverOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2">
                  <input
                    autoFocus
                    type="text"
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    placeholder="Search drivers by name, email or mobile"
                    className="w-full border border-gray-200 rounded-md px-3 py-2"
                  />
                </div>
                <div className="max-h-48 overflow-auto divide-y divide-gray-100">
                  {filteredDrivers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No drivers found
                    </div>
                  ) : (
                    filteredDrivers.map((d) => (
                      <button
                        key={d._id}
                        type="button"
                        onClick={() => {
                          setSelectedDriver(d._id);
                          // keep conductor selection so admin can assign both
                          setDriverOpen(false);
                          setDriverFilter("");
                        }}
                        className={`w-full text-left px-3 py-3 hover:bg-gray-50 ${
                          selectedDriver === d._id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="text-sm text-gray-900">
                          {d.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {d.email || d.mobile}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conductors
            </label>
            <button
              type="button"
              onClick={() => {
                setConductorOpen((s) => !s);
              }}
              className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between ${
                selectedConductor ? "bg-white" : "bg-white"
              }`}
            >
              <span
                className={`truncate ${
                  selectedConductor ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {selectedConductor
                  ? (conductors.find((x) => x._id === selectedConductor)
                      ?.fullName || "Selected") +
                    " — " +
                    (conductors.find((x) => x._id === selectedConductor)
                      ?.email ||
                      conductors.find((x) => x._id === selectedConductor)
                        ?.mobile ||
                      "")
                  : "Search conductors by name, email or mobile"}
              </span>
              <svg
                className="h-4 w-4 text-gray-500 ml-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {conductorOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2">
                  <input
                    autoFocus
                    type="text"
                    value={conductorFilter}
                    onChange={(e) => setConductorFilter(e.target.value)}
                    placeholder="Search conductors by name, email or mobile"
                    className="w-full border border-gray-200 rounded-md px-3 py-2"
                  />
                </div>
                <div className="max-h-48 overflow-auto divide-y divide-gray-100">
                  {filteredConductors.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No conductors found
                    </div>
                  ) : (
                    filteredConductors.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedConductor(c._id);
                          // keep driver selection so admin can assign both
                          setConductorOpen(false);
                          setConductorFilter("");
                        }}
                        className={`w-full text-left px-3 py-3 hover:bg-gray-50 ${
                          selectedConductor === c._id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="text-sm text-gray-900">
                          {c.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.email || c.mobile}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Permission
            </label>
            <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-700">
              Booking Management: Allowed
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={assignPassword}
              onChange={(e) => setAssignPassword(e.target.value)}
              placeholder="Enter password for selected account"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <button
              type="submit"
              disabled={assigning}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? "Assigning..." : "Assign Account"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModal}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingRole ? "Edit Role" : "Add New Role"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {errors.submit && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter role name"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter role description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Permissions
                    </label>
                    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                      {permissionModules.map((module) => {
                        const permissions = getPermissionLabels(module.key);
                        const modulePermissions =
                          formData.permissions[module.key] || {};
                        const allChecked = permissions.every(
                          (perm) => modulePermissions[perm.key]
                        );

                        return (
                          <div
                            key={module.key}
                            className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-900">
                                {module.label}
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleAll(module.key, !allChecked)
                                }
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {allChecked ? "Deselect All" : "Select All"}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {permissions.map((perm) => (
                                <label
                                  key={perm.key}
                                  className="flex items-center space-x-2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      modulePermissions[perm.key] || false
                                    }
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        module.key,
                                        perm.key,
                                        e.target.checked
                                      )
                                    }
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {perm.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createRoleMutation.isLoading ||
                      updateRoleMutation.isLoading
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingRole ? "Update Role" : "Create Role"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRoles;
