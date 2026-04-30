import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  DocumentDownloadIcon,
  ClockIcon,
  FilterIcon,
  XIcon,
  ExclamationIcon,
  CalendarIcon,
  SearchIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/outline";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axiosInstance from "../../utils/axiosConfig";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/resuable/ConfirmModal";
import logo from "../../assets/logo.png";

const Reports = () => {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dayComplete, setDayComplete] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [, setHasTodayRecords] = useState(false);
  const [, setActiveWorkingStaff] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("monthly"); // 'monthly' or 'custom'
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { register, handleSubmit, watch, getValues } = useForm({
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      staffId: "all",
      startDate: new Date(new Date().setDate(1)).toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedMonth = watch("month");
  const selectedYear = watch("year");
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  useEffect(() => {
    fetchStaff();
    checkDayCompletion();
    
    // Fetch initial report (current month) on mount
    fetchReport(getValues());

    const interval = setInterval(checkDayCompletion, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchActiveWorkingStaff();
    const interval = setInterval(fetchActiveWorkingStaff, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveWorkingStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/reports/live");
      const active = data.records.filter((r) => r.isActive);
      setActiveWorkingStaff(active);
    } catch (error) {
      console.error("Error fetching active staff:", error);
    }
  };

  const filteredAttendance = attendance.filter((record) => {
    if (!searchTerm) return true;
    const staffName =
      `${record.userId?.firstName || ""} ${record.userId?.lastName || ""}`.toLowerCase();
    const email = (record.userId?.email || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return staffName.includes(search) || email.includes(search);
  });

  const checkDayCompletion = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    if (day === 0) {
      setDayComplete(true);
      return;
    }
    if (day === 6) {
      setDayComplete(hour >= 18);
      return;
    }
    setDayComplete(hour >= 18);
  };

  const fetchStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/staff");
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchReport = async (formData) => {
    try {
      setLoading(true);
      let response;

      if (filterType === "custom") {
        response = await axiosInstance.get("/admin/reports/custom", {
          params: {
            startDate: formData.startDate,
            endDate: formData.endDate,
            staffId: formData.staffId,
          },
        });
      } else {
        response = await axiosInstance.get("/admin/reports/monthly", {
          params: {
            month: formData.month,
            year: formData.year,
            staffId: formData.staffId,
          },
        });
      }

      setAttendance(response.data);
      setExpandedRecord(null);

      const today = new Date().toISOString().split("T")[0];
      const hasToday = response.data.some((record) => {
        const recordDate = new Date(record.date).toISOString().split("T")[0];
        return recordDate === today;
      });
      setHasTodayRecords(hasToday);

      if (response.data.length === 0) {
        toast.info("No attendance records found for this period");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
      setShowFilters(false);
    }
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const handleDelete = (record) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  const onUpdateAttendance = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      punchIn: formData.get("punchIn")
        ? new Date(
            new Date(selectedRecord.date).toDateString() +
              " " +
              formData.get("punchIn"),
          )
        : null,
      punchOut: formData.get("punchOut")
        ? new Date(
            new Date(selectedRecord.date).toDateString() +
              " " +
              formData.get("punchOut"),
          )
        : null,
      status: formData.get("status"),
    };

    try {
      setLoading(true);
      await axiosInstance.put(`/admin/attendance/${selectedRecord._id}`, data);
      toast.success("Attendance updated successfully");
      setShowEditModal(false);
      fetchReport(getValues());
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAttendance = async () => {
    try {
      setLoading(true);
      await axiosInstance.delete(`/admin/attendance/${selectedRecord._id}`);
      toast.success("Attendance deleted successfully");
      setShowDeleteModal(false);
      fetchReport(getValues());
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("Failed to delete attendance");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    const today = new Date();

    if (filterType === "custom") {
      if (new Date(data.startDate) > new Date(data.endDate)) {
        toast.error("Start date cannot be after end date");
        return;
      }
      await fetchReport(data);
      return;
    }

    const isToday =
      parseInt(data.month) === today.getMonth() + 1 &&
      parseInt(data.year) === today.getFullYear();

    if (isToday && !dayComplete) {
      setPendingFormData(data);
      setShowReportConfirm(true);
      return;
    }

    await fetchReport(data);
  };

  const handleConfirmReport = async () => {
    if (pendingFormData) {
      await fetchReport(pendingFormData);
      setPendingFormData(null);
    }
    setShowReportConfirm(false);
  };

  const handleCancelReport = () => {
    setPendingFormData(null);
    setShowReportConfirm(false);
  };

  const getDateWithDayType = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const formattedDate = date.toLocaleDateString();

    if (day === 0) {
      return `${formattedDate} (Sunday)`;
    } else if (day === 6) {
      return `${formattedDate} (Saturday)`;
    }
    return formattedDate;
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const monthName = new Date(
        selectedYear,
        selectedMonth - 1,
      ).toLocaleString("default", { month: "long" });

      const addLogoAndGenerate = () => {
        // Create an image element and load the imported logo
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
          try {
            const maxHeight = 20;
            const maxWidth = 40;
            const originalWidth = img.width;
            const originalHeight = img.height;
            let newWidth = maxHeight;
            let newHeight = maxHeight;

            if (originalWidth > originalHeight) {
              newWidth = (originalWidth / originalHeight) * maxHeight;
              if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = (originalHeight / originalWidth) * maxWidth;
              }
            } else {
              newHeight = (originalHeight / originalWidth) * newWidth;
            }
            doc.addImage(img, "PNG", 14, 8, newWidth, newHeight);
            generateReportContent(doc, monthName, true);
          } catch (err) {
            console.error("Logo error, generating without logo:", err);
            generateReportContent(doc, monthName, false);
          }
        };

        img.onerror = () => {
          console.error("Logo not found, generating without logo");
          generateReportContent(doc, monthName, false);
        };

        // Use the imported logo
        img.src = logo;
      };

      addLogoAndGenerate();
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF");
    }
  };
  const generateReportContent = (doc, monthName, hasLogo) => {
    try {
      const startY = hasLogo ? 35 : 25;

      if (!hasLogo) {
        doc.setFontSize(18);
        doc.setTextColor(2, 12, 76);
        doc.text("Mostech Business Solutions", 14, 20);
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Monthly Attendance Report", 14, startY);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Month: ${monthName} ${selectedYear}`, 14, startY + 8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 14);
      doc.text(`Total Records: ${attendance.length}`, 14, startY + 20);

      if (attendance.length === 0) {
        doc.text("No completed attendance records found", 14, startY + 30);
        doc.save(`attendance_${monthName}_${selectedYear}.pdf`);
        toast.success("PDF downloaded successfully");
        return;
      }

      const tableColumn = [
        "Staff Name",
        "Date",
        "Punch In",
        "Punch Out",
        "Worked Hours",
        "Overtime",
        "Status",
      ];
      const tableRows = [];

      // Helper to check if staff is currently working
      const isCurrentlyWorking = (item) => {
        const recordDate = new Date(item.date).toDateString();
        const today = new Date().toDateString();
        return recordDate === today && item.punchIn && !item.punchOut;
      };

      filteredAttendance.forEach((item) => {
        const staffName =
          `${item.userId?.firstName || ""} ${item.userId?.lastName || ""}`.trim() ||
          "Unknown";
        const date = getDateWithDayType(item.date);
        const punchIn = item.punchIn
          ? new Date(item.punchIn).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";
        const punchOut = item.punchOut
          ? new Date(item.punchOut).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";
        const hours = item.totalWorkedHours?.toFixed(2) || "0";
        const overtime = item.overtimeHours?.toFixed(2) || "0";

        let statusText;
        let statusType;
        const workingNow = isCurrentlyWorking(item);

        if (workingNow) {
          statusText = "Working Now";
          statusType = "working";
        } else if (item.status === "present") {
          statusText = "Present";
          statusType = "present";
        } else if (item.status === "half-day") {
          statusText = "Half Day";
          statusType = "half-day";
        } else {
          statusText = "Absent";
          statusType = "absent";
        }

        tableRows.push({
          rowData: [
            staffName,
            date,
            punchIn,
            punchOut,
            hours,
            overtime,
            statusText,
          ],
          status: statusType,
        });
      });

      // Calculate summary - separate working now from present/absent
      let workingNowCount = 0;
      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let totalHoursSum = 0;

      attendance.forEach((item) => {
        const workingNow = isCurrentlyWorking(item);
        if (workingNow) {
          workingNowCount++;
        } else if (item.status === "present") {
          presentCount++;
        } else if (item.status === "half-day") {
          halfDayCount++;
        } else {
          absentCount++;
        }
        totalHoursSum += item.totalWorkedHours || 0;
      });

      // Generate table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows.map((row) => row.rowData),
        startY: startY + 25,
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [2, 12, 76],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },
        didParseCell: function (data) {
          if (data.section === "body" && data.row.index >= 0) {
            const rowStatus = tableRows[data.row.index]?.status;

            // Green background for working now rows
            if (rowStatus === "working") {
              data.cell.styles.fillColor = [220, 252, 231]; // Light green
              data.cell.styles.textColor = [22, 101, 52]; // Dark green
              data.cell.styles.fontStyle = "bold";
            }
            // Light red for absent records
            else if (rowStatus === "absent") {
              data.cell.styles.fillColor = [255, 200, 200];
              data.cell.styles.textColor = [139, 0, 0];
            }

            // Color overtime cells orange if overtime > 0
            if (data.column.index === 5 && data.row.index >= 0) {
              const overtimeValue = parseFloat(
                tableRows[data.row.index]?.rowData[5] || "0",
              );
              if (overtimeValue > 0) {
                data.cell.styles.textColor = [255, 140, 0];
                data.cell.styles.fontStyle = "bold";
              }
            }
          }
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 22 },
        },
      });

      const finalY = doc.lastAutoTable?.finalY || doc.autoTableEndPosY || 200;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);

      // Update summary text to include working now count
      let summaryText = `Summary: `;
      if (workingNowCount > 0) {
        summaryText += `${workingNowCount} Working Now, `;
      }
      summaryText += `${presentCount} Present, ${halfDayCount} Half Day, ${absentCount} Absent`;
      doc.text(summaryText, 14, finalY + 8);
      doc.text(
        `Total Hours Worked: ${totalHoursSum.toFixed(2)} hrs`,
        14,
        finalY + 14,
      );

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Generated by Mostech Business Solutions Time tracker",
        105,
        finalY + 25,
        { align: "center" },
      );

      doc.save(`attendance_${monthName}_${selectedYear}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating report content:", error);
      toast.error("Failed to generate PDF: " + error.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "half-day":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  const isStaffCurrentlyWorking = (record) => {
    // Check if the record has a punchIn and no punchOut for today
    const hasPunchIn = record.punchIn !== null && record.punchIn !== undefined;
    const hasPunchOut =
      record.punchOut !== null && record.punchOut !== undefined;

    // For today's date only
    const recordDate = new Date(record.date).toDateString();
    const today = new Date().toDateString();

    // If it's today's record, not punched out yet, and has punch in
    if (recordDate === today && hasPunchIn && !hasPunchOut) {
      return true;
    }
    return false;
  };

  const toggleRecordExpand = (index) => {
    setExpandedRecord(expandedRecord === index ? null : index);
  };

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2024, i).toLocaleString("default", { month: "long" }),
  );

  const getLiveStatusCounts = () => {
    const today = new Date().toDateString();

    let workingNow = 0;
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let totalHours = 0;

    attendance.forEach((record) => {
      const recordDate = new Date(record.date).toDateString();
      const isToday = recordDate === today;
      const isWorkingNow = isToday && record.punchIn && !record.punchOut;

      if (isWorkingNow) {
        workingNow++;
      } else {
        if (record.status === "present") present++;
        else if (record.status === "half-day") halfDay++;
        else if (record.status === "absent") absent++;
      }

      totalHours += record.totalWorkedHours || 0;
    });

    return { workingNow, present, halfDay, absent, totalHours };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section - Clean and Simple */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1
              className="text-xl sm:text-2xl lg:text-3xl font-bold"
              style={{ color: "#020c4c" }}
            >
              Attendance Reports
            </h1>
            {attendance.length > 0 && (
              <button
                onClick={downloadPDF}
                className="sm:hidden flex items-center space-x-2 px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-all"
                style={{ background: "#0a1a6e" }}
              >
                <DocumentDownloadIcon className="h-4 w-4" />
                <span className="text-sm">PDF</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Desktop PDF Button */}
            {attendance.length > 0 && (
              <button
                onClick={downloadPDF}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg text-white hover:opacity-90 transition-all"
                style={{ background: "#0a1a6e" }}
              >
                <DocumentDownloadIcon className="h-4 w-4" />
                <span className="text-sm">Download PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Type Toggle - Responsive */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => {
              setFilterType("monthly");
              setShowFilters(false);
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              filterType === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => {
              setFilterType("custom");
              setShowFilters(true);
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              filterType === "custom"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Custom Date Range
          </button>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center space-x-2">
              <FilterIcon className="h-5 w-5" style={{ color: "#020c4c" }} />
              <span
                className="font-medium text-sm"
                style={{ color: "#020c4c" }}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </span>
            </div>
            {!showFilters && (
              <span className="text-xs text-gray-500">
                {filterType === "monthly"
                  ? `${monthNames[selectedMonth - 1]} ${selectedYear}`
                  : `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
              </span>
            )}
          </button>
        </div>

        {/* Filter Form - Responsive */}
        <div
          className={`${showFilters ? "block" : "hidden md:block"} mb-6 transition-all duration-300`}
        >
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filterType === "monthly" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Month
                      </label>
                      <select
                        {...register("month")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {monthNames.map((month, i) => (
                          <option key={i + 1} value={i + 1}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        {...register("year")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {[2024, 2025, 2026].map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <div className="relative">
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                          type="date"
                          {...register("startDate")}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          onClick={(e) => e.target.showPicker?.()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                          type="date"
                          {...register("endDate")}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          onClick={(e) => e.target.showPicker?.()}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Member
                  </label>
                  <select
                    {...register("staffId")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Staff</option>
                    {staff.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Generating...</span>
                      </div>
                    ) : filterType === "custom" ? (
                      "Generate Report"
                    ) : (
                      "Generate Report"
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Display Date Range Summary - Only when records exist */}
            {filteredAttendance.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Showing {filteredAttendance.length} of {attendance.length}{" "}
                  record(s)
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Report Results - Simplified Table */}
        {attendance.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            {/* Summary Header */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    Total Records: {attendance.length}
                  </p>
                  {getLiveStatusCounts().workingNow > 0 && (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-xs text-green-600">
                        {getLiveStatusCounts().workingNow} working now
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Total Hours:</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#020c4c" }}
                    >
                      {getLiveStatusCounts().totalHours.toFixed(2)} hrs
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Overtime:</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {attendance
                        .reduce(
                          (sum, record) => sum + (record.overtimeHours || 0),
                          0,
                        )
                        .toFixed(2)}{" "}
                      hrs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead style={{ background: "#020c4c" }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Staff Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Punch In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Punch Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Worked Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Overtime
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
                  {filteredAttendance.map((record, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-medium">
                              {record.userId?.firstName?.charAt(0)}
                              {record.userId?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {record.userId?.firstName}{" "}
                              {record.userId?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getDateWithDayType(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap font-mono text-sm font-medium"
                        style={{ color: "#020c4c" }}
                      >
                        {record.totalWorkedHours?.toFixed(2)} hrs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        {record.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium">
                            +{record.overtimeHours?.toFixed(2)} hrs
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isStaffCurrentlyWorking(record) ? (
                          <div className="flex items-center space-x-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              Working Now
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}
                          >
                            {record.status === "present"
                              ? "Present"
                              : record.status === "half-day"
                                ? "Half Day"
                                : "Absent"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredAttendance.map((record, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {record.userId?.firstName?.charAt(0)}
                          {record.userId?.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {record.userId?.firstName} {record.userId?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getDateWithDayType(record.date)}
                        </p>
                      </div>
                    </div>
                    {/* Status badge in mobile view */}
                    {isStaffCurrentlyWorking(record) ? (
                      <div className="flex items-center space-x-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          Working Now
                        </span>
                      </div>
                    ) : (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}
                      >
                        {record.status === "present"
                          ? "Present"
                          : record.status === "half-day"
                            ? "Half Day"
                            : "Absent"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Punch In</p>
                      <p className="text-sm font-mono font-medium">
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Punch Out</p>
                      <p className="text-sm font-mono font-medium">
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleRecordExpand(index)}
                    className="mt-3 text-xs text-blue-600 font-medium w-full text-center py-1 hover:bg-blue-50 rounded transition-colors"
                  >
                    {expandedRecord === index ? "Show Less" : "Show More"}
                  </button>

                  {expandedRecord === index && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600">Worked Hours</p>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#020c4c" }}
                          >
                            {record.totalWorkedHours?.toFixed(2)} hrs
                          </p>
                        </div>
                        {record.overtimeHours > 0 && (
                          <div className="bg-orange-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">Overtime</p>
                            <p className="text-sm font-semibold text-orange-600">
                              +{record.overtimeHours?.toFixed(2)} hrs
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-3 mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(record)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(record)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary Footer */}
            <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="bg-white rounded-lg p-2">
                  <p className="text-xs text-gray-500">Working Now</p>
                  <div className="flex items-center justify-center space-x-1">
                    <p className="text-lg font-bold text-green-600">
                      {getLiveStatusCounts().workingNow}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-lg font-bold text-green-600">
                    {getLiveStatusCounts().present}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-xs text-gray-500">Half Day</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {getLiveStatusCounts().halfDay}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="text-lg font-bold text-red-600">
                    {getLiveStatusCounts().absent}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-xs text-gray-500">Total Hours</p>
                  <p className="text-lg font-bold" style={{ color: "#020c4c" }}>
                    {getLiveStatusCounts().totalHours.toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {attendance.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <DocumentDownloadIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">
              No attendance records found
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Try selecting a different period or staff member
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: "#020c4c" }}
            ></div>
            <p className="mt-4 text-gray-600">Generating report...</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showReportConfirm}
        onClose={handleCancelReport}
        onConfirm={handleConfirmReport}
        title="Generate Report"
        message="Today's attendance is still in progress. Some records may be incomplete. Do you want to continue?"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAttendance}
        title="Delete Attendance Record"
        message={`Are you sure you want to delete this attendance record for ${selectedRecord?.userId?.firstName}? This action cannot be undone.`}
      />

      {/* Edit Attendance Modal */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div
              className="px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl"
              style={{ background: "#020c4c" }}
            >
              <h3 className="text-lg font-bold text-white">Edit Attendance</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:text-gray-200"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={onUpdateAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member
                </label>
                <p className="text-gray-900 font-medium">
                  {selectedRecord.userId?.firstName}{" "}
                  {selectedRecord.userId?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {getDateWithDayType(selectedRecord.date)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Punch In Time
                </label>
                <input
                  type="time"
                  name="punchIn"
                  defaultValue={
                    selectedRecord.punchIn
                      ? new Date(selectedRecord.punchIn)
                          .toTimeString()
                          .slice(0, 5)
                      : ""
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Punch Out Time
                </label>
                <input
                  type="time"
                  name="punchOut"
                  defaultValue={
                    selectedRecord.punchOut
                      ? new Date(selectedRecord.punchOut)
                          .toTimeString()
                          .slice(0, 5)
                      : ""
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={selectedRecord.status}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                  <option value="working">Working</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
