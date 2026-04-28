import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "../../utils/axiosConfig";
import toast from "react-hot-toast";
import {
  CalendarIcon,
  PhotographIcon,
  XIcon,
  ClipboardIcon,
  ClipboardCheckIcon,
  MenuIcon,
  ChevronRightIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/outline";
import ConfirmModal from "../../components/resuable/ConfirmModal";

// List of holidays for 2026
const HOLIDAYS_2026 = [
  new Date(2026, 0, 1), // New Year's Day
  new Date(2026, 0, 26), // Republic Day
  new Date(2026, 2, 20), // Id-ul-Fitr (Ramzan)
  new Date(2026, 3, 3), // Good Friday
  new Date(2026, 3, 15), // Vishu
  new Date(2026, 4, 1), // May Day
  new Date(2026, 4, 27), // Id-ul-Ad'ha (Bakrid)
  new Date(2026, 7, 15), // Independence Day
  new Date(2026, 7, 25), // Milad-i-Sherif
  new Date(2026, 7, 26), // Thiruvonam
  new Date(2026, 9, 2), // Gandhi Jayanthi
  new Date(2026, 11, 25), // Christmas
];

// Function to check if a date is a holiday
const isHoliday = (date) => {
  return HOLIDAYS_2026.some(
    (holiday) =>
      holiday.getFullYear() === date.getFullYear() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate(),
  );
};

// Function to check if a date is a Sunday
const isSunday = (date) => {
  return date.getDay() === 0;
};

// Function to calculate working days between two dates
const calculateWorkingDays = (startDate, endDate, leaveType) => {
  if (!startDate) return 0;

  if (leaveType === "half-day") {
    return 0.5; // Half day = 0.5 days
  }

  if (!endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) return 0;

  let workingDays = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    if (!isSunday(currentDate) && !isHoliday(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
};

// Function to format date for display
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const LeaveRequest = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      leaveType: "full-day",
    },
  });
  const [leaves, setLeaves] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [leaveId, setLeaveId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLeaveRequestDeleteConfirm, setShowLeaveRequestDeleteConfirm] =
    useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Watch form values
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const leaveType = watch("leaveType");
  const halfDayTime = watch("halfDayTime");

  // Calculate working days
  const [workingDays, setWorkingDays] = useState(0);
  const [excludedDates, setExcludedDates] = useState({
    sundays: 0,
    holidays: 0,
  });

  // Update working days when dates change
  useEffect(() => {
    if (startDate) {
      // Auto-set end date if it's empty or before start date
      if (leaveType === "full-day" && (!endDate || endDate < startDate)) {
        setValue("endDate", startDate);
      }

      const days = calculateWorkingDays(
        startDate,
        endDate,
        leaveType,
        halfDayTime,
      );
      setWorkingDays(days);

      if (leaveType === "full-day" && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let sundayCount = 0;
        let holidayCount = 0;
        let currentDate = new Date(start);

        while (currentDate <= end) {
          if (isSunday(currentDate)) sundayCount++;
          if (isHoliday(currentDate)) holidayCount++;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        setExcludedDates({ sundays: sundayCount, holidays: holidayCount });
      } else {
        setExcludedDates({ sundays: 0, holidays: 0 });
      }
    } else {
      setWorkingDays(0);
      setExcludedDates({ sundays: 0, holidays: 0 });
    }
  }, [startDate, endDate, leaveType, halfDayTime, setValue]);

  // Fetch leaves on component mount
  useEffect(() => {
    fetchLeaves();
  }, []);

  // Generate unique ID on component mount
  useEffect(() => {
    generateUniqueId();
  }, []);

  const generateUniqueId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newId = `LVE-${dateStr}-${randomStr}`;
    setLeaveId(newId);
    setValue("leaveId", newId);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(leaveId);
    setCopied(true);
    toast.success("Leave ID copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const fetchLeaves = async () => {
    try {
      const { data } = await axios.get("/staff/leaves");
      setLeaves(data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to fetch leave history");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const onSubmit = async (data) => {
    console.log("Submitting leave request:", data);
    if (!selectedFile) {
      toast.error("Please upload an email screenshot");
      return;
    }

    if (workingDays === 0) {
      toast.error("Please select valid dates");
      return;
    }

    const formData = new FormData();
    formData.append("startDate", data.startDate);
    formData.append("leaveType", data.leaveType);
    formData.append("reason", data.reason);
    formData.append("leaveId", leaveId);
    formData.append("leaveDays", workingDays);
    formData.append("emailScreenshot", selectedFile);

    if (data.leaveType === "full-day") {
      formData.append("endDate", data.endDate);
    } else {
      formData.append("halfDayTime", data.halfDayTime);
      formData.append("endDate", data.startDate);
    }

    try {
      setUploading(true);
      const response = await axios.post("/staff/leave", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        response.data.message || "Leave request submitted successfully",
      );
      reset({
        leaveType: "full-day",
      });
      removeSelectedFile();
      generateUniqueId();
      setWorkingDays(0);
      setShowRequestForm(false);
      fetchLeaves();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit leave request",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancelLeave = (leaveId) => {
    setSelectedLeaveId(leaveId);
    setShowLeaveRequestDeleteConfirm(true);
  };

  const confirmCancelLeave = async () => {
    try {
      await axios.delete(`/staff/leave/${selectedLeaveId}`);
      toast.success("Leave request cancelled");
      setShowLeaveRequestDeleteConfirm(false);
      setSelectedLeaveId(null);
      fetchLeaves();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel leave request",
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getLeaveTypeDisplay = (leave) => {
    if (leave.leaveType === "half-day") {
      return `${leave.halfDayTime === "morning" ? "☀️ Morning" : "🌙 Afternoon"} Half Day`;
    }
    return "📅 Full Day";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#020c4c" }}>
              Leave Management
            </h1>
            <p className="text-gray-500 mt-1">
              View your leave history and submit new requests
            </p>
          </div>
          <button
            onClick={() => {
              generateUniqueId();
              setShowRequestForm(true);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            style={{ background: "#020c4c" }}
          >
            <ClipboardIcon className="h-5 w-5" />
            <span className="font-semibold">Request New Leave</span>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <ClipboardCheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaves.filter((l) => l.status === "approved").length}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaves.filter((l) => l.status === "pending").length}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="bg-red-100 p-3 rounded-xl">
              <XIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaves.filter((l) => l.status === "rejected").length}
              </p>
            </div>
          </div>
        </div>

        {/* Leave History Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold" style={{ color: "#020c4c" }}>
              Leave History
            </h3>
            <span className="text-sm text-gray-500">
              Total: {leaves.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            {leaves.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">
                  No leave requests found
                </p>
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="mt-4 text-blue-600 hover:underline text-sm font-medium"
                >
                  Submit your first request
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Leave ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {leave.leaveId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {leave.startDate && leave.endDate
                            ? `${new Date(leave.startDate).toLocaleDateString()} ${leave.endDate > leave.startDate ? `- ${new Date(leave.endDate).toLocaleDateString()}` : ""}`
                            : new Date(leave.date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {leave.leaveDays} {leave.leaveDays === 1 ? "Day" : "Days"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {getLeaveTypeDisplay(leave)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          {leave.emailScreenshot && (
                            <a
                              href={
                                leave.emailScreenshot.startsWith("http")
                                  ? leave.emailScreenshot
                                  : `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${leave.emailScreenshot}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="View Screenshot"
                            >
                              <PhotographIcon className="h-5 w-5" />
                            </a>
                          )}
                          {leave.status === "pending" && (
                            <button
                              onClick={() => handleCancelLeave(leave._id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Cancel Request"
                            >
                              <XIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Leave Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100" style={{ background: "#020c4c" }}>
              <div>
                <h2 className="text-2xl font-bold text-white">New Leave Request</h2>
                <p className="text-blue-200 text-sm mt-1">Fill in the details to submit your request</p>
              </div>
              <button
                onClick={() => setShowRequestForm(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <input type="hidden" {...register("leaveId")} />
                <input type="hidden" {...register("leaveType")} />
                {/* Leave ID Banner */}
                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-blue-800">Your Leave Request ID</span>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all font-medium flex items-center space-x-1"
                    >
                      {copied ? <ClipboardCheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                      <span>{copied ? "Copied" : "Copy ID"}</span>
                    </button>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-xl px-4 py-3 font-mono text-lg text-center tracking-wider text-blue-900 shadow-sm">
                    {leaveId}
                  </div>
                  <div className="mt-4 text-xs text-blue-600 bg-blue-100/50 p-3 rounded-xl border border-blue-100">
                    <p className="font-bold flex items-center space-x-1 mb-1">
                      <InformationCircleIcon className="h-3 w-3" />
                      <span>Email Instructions:</span>
                    </p>
                    <p>Include this ID in your email subject line: <strong>Leave Request - {leaveId}</strong></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Leave Type */}
                  <div className="col-span-full">
                    <label className="block text-sm font-bold text-gray-700 mb-3">Leave Type</label>
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                      <button
                        type="button"
                        onClick={() => setValue("leaveType", "full-day")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${leaveType === "full-day" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Full Day
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue("leaveType", "half-day")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${leaveType === "half-day" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Half Day
                      </button>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className={leaveType === "full-day" ? "col-span-1" : "col-span-full"}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date *</label>
                    <div className="relative">
                      <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        {...register("startDate", { required: "Date is required" })}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                    {errors.startDate && (
                      <p className="text-red-500 text-xs mt-1 px-1">
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>

                  {/* End Date */}
                  {leaveType === "full-day" && (
                    <div className="col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">End Date *</label>
                      <div className="relative">
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          {...register("endDate", {
                            required: "End date is required",
                            validate: (value) => !startDate || value >= startDate || "Must be after start date"
                          })}
                          min={startDate || new Date().toISOString().split("T")[0]}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        />
                      </div>
                      {errors.endDate && (
                        <p className="text-red-500 text-xs mt-1 px-1">
                          {errors.endDate.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Half Day Selection */}
                  {leaveType === "half-day" && (
                    <div className="col-span-full">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Session *</label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${halfDayTime === 'morning' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                          <input type="radio" value="morning" {...register("halfDayTime", { required: leaveType === "half-day" ? "Please select a session" : false })} className="hidden" />
                          <span className={`text-sm font-bold ${halfDayTime === 'morning' ? 'text-blue-700' : 'text-gray-500'}`}>☀️ Morning (9-1)</span>
                        </label>
                        <label className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${halfDayTime === 'afternoon' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                          <input type="radio" value="afternoon" {...register("halfDayTime")} className="hidden" />
                          <span className={`text-sm font-bold ${halfDayTime === 'afternoon' ? 'text-blue-700' : 'text-gray-500'}`}>🌙 Afternoon (2-6)</span>
                        </label>
                      </div>
                      {errors.halfDayTime && (
                        <p className="text-red-500 text-xs mt-1 px-1">
                          {errors.halfDayTime.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary Banner */}
                {startDate && workingDays > 0 && (
                  <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl text-white shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <InformationCircleIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-100 font-medium">Calculation Summary</p>
                          <p className="text-lg font-bold">Total: {workingDays} {workingDays === 1 ? "Day" : "Days"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-blue-200 uppercase tracking-wider font-bold">Duration</p>
                        <p className="text-sm font-bold">{formatDateForDisplay(startDate)} {endDate && `- ${formatDateForDisplay(endDate)}`}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Leave *</label>
                  <textarea
                    {...register("reason", { required: "Reason is required", minLength: 10 })}
                    rows="4"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none"
                    placeholder="Provide a brief explanation for your leave request..."
                  />
                  {errors.reason && (
                    <p className="text-red-500 text-xs mt-1 px-1">
                      {errors.reason.message}
                    </p>
                  )}
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Screenshot *</label>
                  {!previewUrl ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="modal-screenshot" />
                      <label htmlFor="modal-screenshot" className="cursor-pointer">
                        <PhotographIcon className="h-12 w-12 text-gray-300 mx-auto mb-3 group-hover:text-blue-400" />
                        <p className="text-sm font-bold text-gray-600">Click to upload screenshot</p>
                        <p className="text-xs text-gray-400 mt-1">Maximum size: 5MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-gray-100 h-48 group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={uploading || workingDays === 0}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                    style={{ background: "#020c4c" }}
                  >
                    {uploading ? "Submitting Request..." : "Send Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveRequestDeleteConfirm}
        onClose={() => {
          setShowLeaveRequestDeleteConfirm(false);
          setSelectedLeaveId(null);
        }}
        onConfirm={confirmCancelLeave}
        title="Confirm Leave Request Cancel"
        message="Are you sure you want to cancel this leave request?"
      />
    </div>
  );
};

export default LeaveRequest;
