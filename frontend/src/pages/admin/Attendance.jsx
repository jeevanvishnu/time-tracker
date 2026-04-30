import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  CalendarIcon,
  UserIcon,
  SearchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  FilterIcon,
  XIcon,
} from "@heroicons/react/outline";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmModal from "../../components/resuable/ConfirmModal";

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    staffId: "all",
    date: new Date().toISOString().split("T")[0],
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchStaff();
    fetchAttendance();
  }, [filters]);

  const fetchStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/staff");
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const { staffId, date } = filters;
      // We'll use the custom report endpoint for fetching attendance for a specific date
      const { data } = await axiosInstance.get(
        `/admin/reports/custom?startDate=${date}&endDate=${date}&staffId=${staffId}`
      );
      setAttendance(data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmitAdd = async (data) => {
    try {
      setIsSubmitting(true);
      
      const formattedData = {
        ...data,
        punchIn: data.punchIn ? new Date(`${data.date}T${data.punchIn}`) : null,
        punchOut: data.punchOut ? new Date(`${data.date}T${data.punchOut}`) : null,
      };

      await axiosInstance.post("/admin/attendance", formattedData);
      toast.success("Attendance added successfully");
      setShowAddModal(false);
      reset();
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitEdit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const recordDateStr = new Date(selectedRecord.date).toISOString().split('T')[0];
      const formattedData = {
        ...data,
        punchIn: data.punchIn ? new Date(`${recordDateStr}T${data.punchIn}`) : null,
        punchOut: data.punchOut ? new Date(`${recordDateStr}T${data.punchOut}`) : null,
      };

      await axiosInstance.put(`/admin/attendance/${selectedRecord._id}`, formattedData);
      toast.success("Attendance updated successfully");
      setShowEditModal(false);
      setSelectedRecord(null);
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (record) => {
    setSelectedRecord(record);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/admin/attendance/${selectedRecord._id}`);
      toast.success("Attendance record deleted");
      setShowDeleteConfirm(false);
      setSelectedRecord(null);
      fetchAttendance();
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setValue("status", record.status);
    
    const getTimeString = (dateStr) => {
      if (!dateStr) return "";
      const dateObj = new Date(dateStr);
      return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    };

    setValue("punchIn", getTimeString(record.punchIn));
    setValue("punchOut", getTimeString(record.punchOut));
    
    setShowEditModal(true);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#020c4c" }}>
              Attendance Management
            </h1>
            <p className="text-gray-500">View and manage staff attendance records</p>
          </div>
          <button
            onClick={() => {
              reset({
                userId: "",
                date: new Date().toISOString().split("T")[0],
                status: "present",
                punchIn: "",
                punchOut: "",
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Manual Attendance</span>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                Staff Member
              </label>
              <select
                name="staffId"
                value={filters.staffId}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              >
                <option value="all">All Staff</option>
                {staff.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                Date
              </label>
              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition cursor-pointer"
                onClick={(e) => e.target.showPicker?.()}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAttendance}
                className="flex items-center justify-center space-x-2 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition w-full md:w-auto"
              >
                <SearchIcon className="h-5 w-5" />
                <span>Refresh List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: "#020c4c" }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Punch In
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Punch Out
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Working Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500">Loading attendance records...</p>
                      </div>
                    </td>
                  </tr>
                ) : attendance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <CalendarIcon className="h-12 w-12 text-gray-300 mb-2" />
                        <p>No attendance records found for this selection</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {record.userId?.firstName?.charAt(0)}
                            {record.userId?.lastName?.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.userId?.firstName} {record.userId?.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {record.userId?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(record.punchIn)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(record.punchOut)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold" style={{ color: "#020c4c" }}>
                          {record.totalWorkedHours?.toFixed(2) || "0.00"} hrs
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : record.status === "half-day"
                              ? "bg-yellow-100 text-yellow-800"
                              : record.status === "absent"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900 transition p-1 rounded-md hover:bg-blue-50"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-900 transition p-1 rounded-md hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Add Attendance Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitAdd)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                <select
                  {...register("userId", { required: "Staff is required" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Staff</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
                {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  {...register("date", { required: "Date is required" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  onClick={(e) => e.target.showPicker?.()}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punch In Time *</label>
                  <input
                    type="time"
                    {...register("punchIn", { required: "Punch In is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {errors.punchIn && <p className="text-red-500 text-xs mt-1">{errors.punchIn.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punch Out Time *</label>
                  <input
                    type="time"
                    {...register("punchOut", { required: "Punch Out is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {errors.punchOut && <p className="text-red-500 text-xs mt-1">{errors.punchOut.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  {...register("status")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                  <option value="working">Currently Working</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Record"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Edit Attendance Record</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitEdit)} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm font-medium text-blue-800">
                  Staff: {selectedRecord?.userId?.firstName} {selectedRecord?.userId?.lastName}
                </p>
                <p className="text-xs text-blue-600">
                  Date: {new Date(selectedRecord?.date).toLocaleDateString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punch In Time *</label>
                  <input
                    type="time"
                    {...register("punchIn", { required: "Punch In is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {errors.punchIn && <p className="text-red-500 text-xs mt-1">{errors.punchIn.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punch Out Time *</label>
                  <input
                    type="time"
                    {...register("punchOut", { required: "Punch Out is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {errors.punchOut && <p className="text-red-500 text-xs mt-1">{errors.punchOut.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  {...register("status")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                  <option value="working">Currently Working</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Record"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Attendance Record"
        message={`Are you sure you want to delete the attendance record for ${selectedRecord?.userId?.firstName} on ${new Date(selectedRecord?.date).toLocaleDateString()}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Attendance;
