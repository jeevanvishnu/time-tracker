const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const User = require("../models/User");

const { cloudinary, leaveStorage } = require("../config/cloudinary");
const multer = require("multer");
const DailyReport = require("../models/DailyReport");

// Configure multer with Cloudinary storage
const upload = multer({
  storage: leaveStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// @desc    Punch in
// @route   POST /api/staff/punch-in
const punchIn = async (req, res) => {
  try {
    const now = new Date();

    // Get start of day
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Find existing attendance for today
    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay,
    });

    // Check if already punched in
    if (attendance && attendance.punchIn) {
      return res.status(400).json({
        message: "You have already punched in today!",
        error: "already_punched_in",
      });
    }

    if (!attendance) {
      attendance = new Attendance({
        userId: req.user._id,
        date: startOfDay,
        punchIn: now,
        status: "working", // Set status to working immediately
      });
    } else {
      attendance.punchIn = now;
      attendance.status = "working"; // Update status to working
    }

    await attendance.save();

    // Calculate current work duration
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isActive: true,
        isOnBreak: false,
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in punchIn:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Punch out
// @route   POST /api/staff/punch-out
const punchOut = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay,
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(404).json({ message: "No punch in found" });
    }

    if (attendance.punchOut) {
      return res.status(400).json({ message: "Already punched out today" });
    }

    attendance.punchOut = now;

    // Calculate total worked hours (excluding breaks)
    let totalWorkedMs = now - attendance.punchIn;

    // Subtract break times
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((breakPeriod) => {
        if (breakPeriod.breakEnd) {
          totalWorkedMs -= breakPeriod.breakEnd - breakPeriod.breakStart;
        }
      });
    }

    const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);
    attendance.totalWorkedHours = parseFloat(totalWorkedHours.toFixed(2));

    // Calculate overtime based on day
    if (day === 6) {
      // Saturday: 4 hours is full day, anything above is overtime
      if (totalWorkedHours > 4) {
        attendance.overtimeHours = parseFloat(
          (totalWorkedHours - 4).toFixed(2),
        );
      } else {
        attendance.overtimeHours = 0;
      }
    } else {
      // Sunday & Weekdays: 9 hours is full day
      if (totalWorkedHours > 9) {
        attendance.overtimeHours = parseFloat(
          (totalWorkedHours - 9).toFixed(2),
        );
      } else {
        attendance.overtimeHours = 0;
      }
    }

    // Determine status based on day and worked hours
    if (day === 6) {
      // Saturday: 4 hours = present, less than 4 = half-day
      if (totalWorkedHours >= 4) {
        attendance.status = "present";
      } else if (totalWorkedHours > 0) {
        attendance.status = "half-day";
      } else {
        attendance.status = "absent";
      }
    } else {
      // Sunday & Weekdays: 9 hours = present, 4-9 = half-day
      if (totalWorkedHours >= 9) {
        attendance.status = "present";
      } else if (totalWorkedHours >= 4) {
        attendance.status = "half-day";
      } else if (totalWorkedHours > 0) {
        attendance.status = "half-day";
      } else {
        attendance.status = "absent";
      }
    }

    await attendance.save();

    // Calculate current work duration
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        activeSession: false,
        currentWorkSeconds,
        totalWorkedHours: attendance.totalWorkedHours,
        overtimeHours: attendance.overtimeHours,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error("Error in punchOut:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to calculate current work duration (in seconds)
const calculateCurrentWorkDuration = (attendance) => {
  if (!attendance || !attendance.punchIn) return 0;

  const now = new Date();
  let totalWorkMs = 0;

  // If already punched out, return the stored total worked hours
  if (attendance.punchOut) {
    return attendance.totalWorkedHours * 3600;
  }

  // Calculate from punch in to now
  totalWorkMs = now - attendance.punchIn;

  // Subtract break times
  if (attendance.breaks && attendance.breaks.length > 0) {
    attendance.breaks.forEach((breakPeriod) => {
      if (breakPeriod.breakEnd) {
        totalWorkMs -= breakPeriod.breakEnd - breakPeriod.breakStart;
      } else {
        // Ongoing break - subtract time from break start to now
        totalWorkMs -= now - breakPeriod.breakStart;
      }
    });
  }

  // Return seconds, ensure non-negative
  return Math.max(0, Math.floor(totalWorkMs / 1000));
};

// Also add a helper to calculate total worked hours (for saving to database)
const calculateTotalWorkedHours = (attendance) => {
  if (!attendance || !attendance.punchIn) return 0;

  const punchOutTime = attendance.punchOut || new Date();
  let totalWorkMs = punchOutTime - attendance.punchIn;

  // Subtract break times
  if (attendance.breaks && attendance.breaks.length > 0) {
    attendance.breaks.forEach((breakPeriod) => {
      if (breakPeriod.breakEnd) {
        totalWorkMs -= breakPeriod.breakEnd - breakPeriod.breakStart;
      } else if (attendance.punchOut) {
        // Only subtract completed breaks if punched out
        console.log("Incomplete break found");
      }
    });
  }

  const totalHours = totalWorkMs / (1000 * 60 * 60);
  return Math.round(totalHours * 100) / 100;
};

// @desc    Take break
// @route   POST /api/staff/break
const takeBreak = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay,
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(404).json({ message: "No active session" });
    }

    // Check if already on break
    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (lastBreak && !lastBreak.breakEnd) {
      return res.status(400).json({ message: "Already on break" });
    }

    attendance.breaks.push({ breakStart: now });
    await attendance.save();

    // Calculate current work seconds after break
    let totalMs = now - attendance.punchIn;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((breakPeriod) => {
        if (breakPeriod.breakEnd) {
          totalMs -= breakPeriod.breakEnd - breakPeriod.breakStart;
        } else {
          totalMs -= now - breakPeriod.breakStart;
        }
      });
    }
    const currentWorkSeconds = Math.max(0, Math.floor(totalMs / 1000));

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isActive: true,
        isOnBreak: true,
        activeBreakStart: now,
      },
    });
  } catch (error) {
    console.error("Error in takeBreak:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Resume work
// @route   POST /api/staff/resume
const resumeWork = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay,
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(404).json({ message: "No active session" });
    }

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (!lastBreak || lastBreak.breakEnd) {
      return res.status(400).json({ message: "Not on break" });
    }

    lastBreak.breakEnd = now;
    lastBreak.duration = (now - lastBreak.breakStart) / (1000 * 60);
    await attendance.save();

    // Calculate current work seconds after resuming
    let totalMs = now - attendance.punchIn;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((breakPeriod) => {
        if (breakPeriod.breakEnd) {
          totalMs -= breakPeriod.breakEnd - breakPeriod.breakStart;
        }
      });
    }
    const currentWorkSeconds = Math.max(0, Math.floor(totalMs / 1000));

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isActive: true,
        isOnBreak: false,
      },
    });
  } catch (error) {
    console.error("Error in resumeWork:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get today's attendance
// @route   GET /api/staff/today
const getTodayAttendance = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay,
    });

    if (!attendance) {
      return res.json({
        hasAttendance: false,
        message: "No attendance record for today",
      });
    }

    // Calculate current worked seconds
    let currentWorkSeconds = 0;
    let isActive = false;
    let isOnBreak = false;
    let activeBreakStart = null;

    if (attendance.punchIn && !attendance.punchOut) {
      isActive = true;
      let totalMs = now - attendance.punchIn;

      if (attendance.breaks && attendance.breaks.length > 0) {
        attendance.breaks.forEach((breakPeriod) => {
          if (breakPeriod.breakEnd) {
            totalMs -= breakPeriod.breakEnd - breakPeriod.breakStart;
          } else {
            isOnBreak = true;
            activeBreakStart = breakPeriod.breakStart;
            totalMs -= now - breakPeriod.breakStart;
          }
        });
      }
      currentWorkSeconds = Math.max(0, Math.floor(totalMs / 1000));
    }

    // Determine current status for display
    let displayStatus = attendance.status;
    if (isActive && !attendance.punchOut) {
      displayStatus = "working";
    }

    const response = {
      hasAttendance: true,
      attendance: {
        _id: attendance._id,
        userId: attendance.userId,
        date: attendance.date,
        punchIn: attendance.punchIn,
        punchOut: attendance.punchOut,
        totalWorkedHours: attendance.totalWorkedHours,
        overtimeHours: attendance.overtimeHours || 0,
        status: displayStatus,
        breaks: attendance.breaks || [],
        currentWorkSeconds: currentWorkSeconds,
        isActive: isActive,
        isOnBreak: isOnBreak,
        activeBreakStart: activeBreakStart,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getTodayAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Request leave
// @route   POST /api/staff/leave
const requestLeave = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      reason,
      leaveId,
      leaveDays,
      leaveType,
      halfDayTime,
    } = req.body;

    // Check if leaveId already exists
    const existingLeave = await Leave.findOne({ leaveId });
    if (existingLeave) {
      return res
        .status(400)
        .json({ message: "Leave ID already exists. Please try again." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Email screenshot is required" });
    }

    // Validate based on leave type
    const start = new Date(startDate);

    if (leaveType === "half-day") {
      // For half-day, only start date is needed
      if (!halfDayTime) {
        return res
          .status(400)
          .json({ message: "Please specify morning or afternoon" });
      }
    } else {
      // For full-day, validate end date
      const end = new Date(endDate);
      if (start > end) {
        return res
          .status(400)
          .json({ message: "End date must be after start date" });
      }
    }

    const cloudinaryResult = req.file;

    const leaveData = {
      userId: req.user._id,
      leaveId,
      leaveType,
      startDate: start,
      reason,
      emailScreenshot: cloudinaryResult.path,
      cloudinaryPublicId: cloudinaryResult.filename,
      status: "pending",
      leaveDays: parseFloat(leaveDays),
    };

    // Add conditional fields
    if (leaveType === "full-day") {
      leaveData.endDate = new Date(endDate);
    } else {
      leaveData.halfDayTime = halfDayTime;
      leaveData.endDate = start; // For half-day, end date same as start
    }

    console.log("Request Body:", req.body);
    console.log("File Info:", req.file);

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Email screenshot upload failed. Please check your connection or Cloudinary settings." });
    }

    const leave = new Leave(leaveData);

    try {
      await leave.save();
    } catch (saveError) {
      if (saveError.name === 'ValidationError') {
        const messages = Object.values(saveError.errors).map(val => val.message);
        return res.status(400).json({ message: "Validation Error", errors: messages });
      }
      throw saveError;
    }

    await leave.populate("userId", "email firstName lastName");

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      leave,
    });
  } catch (error) {
    console.error("Error in requestLeave:", error);

    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (deleteError) {
        console.error("Error deleting uploaded file:", deleteError);
      }
    }

    res.status(500).json({ 
      message: "Server error during leave request", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Cancel leave request (deletes image from Cloudinary)
// @route   DELETE /api/staff/leave/:id
const cancelLeaveRequest = async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Only allow cancellation of pending requests
    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Cannot cancel a processed leave request" });
    }

    // Delete image from Cloudinary
    if (leave.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(leave.cloudinaryPublicId);
    }

    // Delete the leave request
    await leave.deleteOne();

    res.json({
      success: true,
      message: "Leave request cancelled successfully",
    });
  } catch (error) {
    console.error("Error in cancelLeaveRequest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user's leaves
// @route   GET /api/staff/leaves
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ userId: req.user._id })
      .sort({ startDate: -1 })
      .select("-cloudinaryPublicId");

    res.json(leaves);
  } catch (error) {
    console.error("Error in getMyLeaves:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update profile
// @route   PUT /api/staff/profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const user = await User.findById(req.user._id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    if (req.file) {
      // If using Cloudinary, req.file.path contains the URL
      user.profileImage = req.file.path;
    }

    await user.save();

    // Return the updated user data (excluding password)
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
      },
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get staff's own daily reports
// @route   GET /api/staff/reports/daily
const getMyDailyReports = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    let query = { userId: req.user._id };

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const reports = await DailyReport.find(query)
      .sort({ date: -1 })
      .limit(limit ? parseInt(limit) : 100);

    res.json(reports);
  } catch (error) {
    console.error("Error in getMyDailyReports:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a specific daily report by ID
// @route   GET /api/staff/reports/daily/:id
const getMyDailyReportById = async (req, res) => {
  try {
    const report = await DailyReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json(report);
  } catch (error) {
    console.error("Error in getMyDailyReportById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add remark to a daily report
// @route   POST /api/staff/reports/:id/remark
const addRemarkToReport = async (req, res) => {
  try {
    const { remark } = req.body;

    if (!remark || !remark.trim()) {
      return res.status(400).json({ message: "Remark cannot be empty" });
    }

    const report = await DailyReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Update remarks - preserve existing if any, or add new
    if (report.remarks) {
      // Append new remark with timestamp
      const timestamp = new Date().toLocaleString();
      report.remarks = `${report.remarks}\n\n[${timestamp}] ${remark}`;
    } else {
      report.remarks = remark;
    }
    report.remarkAddedAt = new Date();

    await report.save();

    res.json({
      success: true,
      message: "Remark added successfully",
      report,
    });
  } catch (error) {
    console.error("Error in addRemarkToReport:", error);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = {
  punchIn,
  punchOut,
  takeBreak,
  resumeWork,
  getTodayAttendance,
  requestLeave,
  getMyLeaves,
  updateProfile,
  cancelLeaveRequest,
  getMyDailyReports,
  getMyDailyReportById,
  addRemarkToReport,
};
