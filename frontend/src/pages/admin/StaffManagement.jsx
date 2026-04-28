import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  UserAddIcon,
  MailIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  RefreshIcon,
  UsersIcon,
  ArchiveIcon,
  MinusCircleIcon,
} from "@heroicons/react/outline";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmModal from "../../components/resuable/ConfirmModal";

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activeStaffToday, setActiveStaffToday] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      joiningDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    fetchStaff();
    fetchActiveStaff();
    // Refresh active staff every 30 seconds
    const interval = setInterval(fetchActiveStaff, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchStaff = async () => {
    try {
      const { data } = await axiosInstance.get(
        `/admin/staff?includeInactive=true`,
      );
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to fetch staff");
    }
  };

  const fetchActiveStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/reports/live");
      const active = data.records.filter((r) => r.isActive);
      setActiveStaffToday(active.map((r) => r.userId?._id));
    } catch (error) {
      console.error("Error fetching active staff:", error);
    }
  };

  const isStaffActiveNow = (staffId) => {
    return activeStaffToday.includes(staffId);
  };

  const getFilteredStaff = () => {
    if (activeTab === "active") {
      return staff.filter((member) => member.isActive === true);
    } else {
      return staff.filter((member) => member.isActive === false);
    }
  };

  const activeCount = staff.filter((m) => m.isActive === true).length;
  const inactiveCount = staff.filter((m) => m.isActive === false).length;

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post("/admin/create-staff", data);
      toast.success(response.data.message || "Staff created successfully");
      setShowAddForm(false);
      reset({
        firstName: "",
        lastName: "",
        email: "",
        joiningDate: new Date().toISOString().split("T")[0],
      });
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdate = async (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.put(
        `/admin/staff/${editingStaff._id}`,
        data,
      );
      toast.success(response.data.message || "Staff updated successfully");
      setShowEditForm(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setValue("firstName", staffMember.firstName);
    setValue("lastName", staffMember.lastName);
    setValue("email", staffMember.email);
    setValue(
      "joiningDate",
      staffMember.joiningDate?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
    );
    setShowEditForm(true);
  };

  const handleDelete = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowDeleteConfirm(true);
  };

  const handleRestore = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowRestoreConfirm(true);
  };

  const handleHardDelete = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowHardDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await axiosInstance.delete(
        `/admin/staff/${selectedStaff._id}`,
      );
      toast.success(response.data.message || "Staff member deactivated");
      setShowDeleteConfirm(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete staff");
    }
  };

  const confirmRestore = async () => {
    try {
      const response = await axiosInstance.put(
        `/admin/staff/${selectedStaff._id}/restore`,
      );
      toast.success(response.data.message || "Staff member restored");
      setShowRestoreConfirm(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore staff");
    }
  };

  const confirmHardDelete = async () => {
    try {
      const response = await axiosInstance.delete(
        `/admin/staff/${selectedStaff._id}/hard`,
      );
      toast.success(response.data.message || "Staff member permanently deleted");
      setShowHardDeleteConfirm(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to permanently delete staff");
    }
  };

  const toggleStaffExpand = (staffId) => {
    setExpandedStaff(expandedStaff === staffId ? null : staffId);
  };

  const filteredStaff = getFilteredStaff();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <h1
            className="text-xl sm:text-2xl lg:text-3xl font-bold"
            style={{ color: "#020c4c" }}
          >
            Staff Management
          </h1>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-white w-full sm:w-auto transition-all duration-200 hover:opacity-90"
            style={{ background: "#020c4c" }}
          >
            <UserAddIcon className="h-5 w-5" />
            <span>{showAddForm ? "Cancel" : "Add Staff"}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("active")}
              className={`
                group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200
                ${
                  activeTab === "active"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <UsersIcon
                className={`
                -ml-0.5 mr-2 h-5 w-5
                ${
                  activeTab === "active"
                    ? "text-blue-600"
                    : "text-gray-400 group-hover:text-gray-500"
                }
              `}
              />
              Active Staff
              {activeCount > 0 && (
                <span
                  className={`
                  ml-2 px-2 py-0.5 text-xs font-medium rounded-full
                  ${
                    activeTab === "active"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  }
                `}
                >
                  {activeCount}
                </span>
              )}
            </button>

            {inactiveCount > 0 && (
              <button
                onClick={() => setActiveTab("inactive")}
                className={`
                  group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200
                  ${
                    activeTab === "inactive"
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <ArchiveIcon
                  className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${
                    activeTab === "inactive"
                      ? "text-red-600"
                      : "text-gray-400 group-hover:text-gray-500"
                  }
                `}
                />
                Inactive Staff
                <span
                  className={`
                  ml-2 px-2 py-0.5 text-xs font-medium rounded-full
                  ${
                    activeTab === "inactive"
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600"
                  }
                `}
                >
                  {inactiveCount}
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Add Staff Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 animate-slideDown">
            <h2
              className="text-lg sm:text-xl font-bold mb-4 sm:mb-6"
              style={{ color: "#020c4c" }}
            >
              Add New Staff Member
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    {...register("firstName", {
                      required: "First name is required",
                    })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    {...register("lastName", {
                      required: "Last name is required",
                    })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <MailIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className="w-full pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="staff@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Joining Date
                </label>
                <div className="relative">
                  <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    {...register("joiningDate")}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use today's date
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#020c4c" }}
                >
                  {isSubmitting ? "Creating..." : "Create Staff"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Staff Form */}
        {showEditForm && editingStaff && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 animate-slideDown">
            <h2
              className="text-lg sm:text-xl font-bold mb-4 sm:mb-6"
              style={{ color: "#020c4c" }}
            >
              Edit Staff Member
            </h2>
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    {...register("firstName", {
                      required: "First name is required",
                    })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    {...register("lastName", {
                      required: "Last name is required",
                    })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <MailIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className="w-full pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Joining Date
                </label>
                <div className="relative">
                  <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    {...register("joiningDate")}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                  style={{ background: "#020c4c" }}
                >
                  {isSubmitting ? "Updating..." : "Update Staff"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingStaff(null);
                  }}
                  className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: "#020c4c" }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                 </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <UserIcon className="h-12 w-12 text-gray-300 mb-2" />
                        <p className="text-sm">
                          {activeTab === "active"
                            ? "No active staff members found"
                            : "No inactive staff members found"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const isCurrentlyWorking = isStaffActiveNow(member._id);
                    return (
                      <tr
                        key={member._id}
                        className={`hover:bg-gray-50 ${member.isActive === false ? "bg-gray-50" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center relative">
                              <span className="text-blue-600 font-medium">
                                {member.firstName?.charAt(0)}
                                {member.lastName?.charAt(0)}
                              </span>
                              {isCurrentlyWorking && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(
                            member.joiningDate || member.createdAt,
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {member.isActive === false ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Inactive
                              </span>
                            ) : (
                              <>
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {member.isActive === false ? (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleRestore(member)}
                                className="text-green-600 hover:text-green-900"
                                title="Restore"
                              >
                                <RefreshIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleHardDelete(member)}
                                className="text-red-600 hover:text-red-900"
                                title="Permanent Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleEdit(member)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(member)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Deactivate"
                              >
                                <MinusCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleHardDelete(member)}
                                className="text-red-600 hover:text-red-900"
                                title="Permanent Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {filteredStaff.map((member) => {
              const isCurrentlyWorking = isStaffActiveNow(member._id);
              return (
                <div
                  key={member._id}
                  className={`p-4 border-b border-gray-200 ${member.isActive === false ? "bg-gray-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center relative">
                        <span className="text-blue-600 font-medium">
                          {member.firstName?.charAt(0)}
                          {member.lastName?.charAt(0)}
                        </span>
                        {isCurrentlyWorking && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="text-base font-semibold text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStaffExpand(member._id)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      {expandedStaff === member._id ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {expandedStaff === member._id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Joined Date:
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(
                              member.joiningDate || member.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Status:</span>
                          <div className="flex items-center space-x-2">
                            {member.isActive === false ? (
                              <span className="px-2 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Inactive
                              </span>
                            ) : (
                              <>
                                <span className="px-2 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                                {isCurrentlyWorking && (
                                  <span className="inline-flex items-center space-x-1 text-xs text-green-600">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span>Working</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                          {member.isActive === false ? (
                            <>
                              <button
                                onClick={() => handleRestore(member)}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:text-green-800"
                              >
                                <RefreshIcon className="h-4 w-4" />
                                <span>Restore</span>
                              </button>
                              <button
                                onClick={() => handleHardDelete(member)}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span>Perm Delete</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(member)}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <PencilIcon className="h-4 w-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(member)}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-yellow-600 hover:text-yellow-800"
                              >
                                <MinusCircleIcon className="h-4 w-4" />
                                <span>Deactivate</span>
                              </button>
                              <button
                                onClick={() => handleHardDelete(member)}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate ${selectedStaff?.firstName} ${selectedStaff?.lastName}? This action can be reversed later.`}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={confirmRestore}
        title="Reactivate Staff Member"
        message={`Are you sure you want to reactivate ${selectedStaff?.firstName} ${selectedStaff?.lastName}?`}
      />

      {/* Hard Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showHardDeleteConfirm}
        onClose={() => setShowHardDeleteConfirm(false)}
        onConfirm={confirmHardDelete}
        title="Permanently Delete Staff"
        message={`Are you sure you want to permanently delete ${selectedStaff?.firstName} ${selectedStaff?.lastName}? This action CANNOT be reversed and will delete all associated data.`}
      />
    </div>
  );
};

export default StaffManagement;