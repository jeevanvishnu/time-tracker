const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const sendEmail = require("../utils/emailService");
const bcrypt = require("bcryptjs");

// @desc    Create staff user
// @route   POST /api/admin/create-staff
const createStaff = async (req, res) => {
  try {
    const { email, firstName, lastName, joiningDate } = req.body;

    // Check if user already exists BEFORE doing anything else
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    let parsedJoiningDate;
    if (joiningDate) {
      parsedJoiningDate = new Date(joiningDate);
      // Set to start of day for consistency
      parsedJoiningDate.setHours(0, 0, 0, 0);
    } else {
      parsedJoiningDate = new Date();
      parsedJoiningDate.setHours(0, 0, 0, 0);
    }

    const user = new User({
      email,
      firstName,
      lastName,
      password: tempPassword,
      role: "staff",
      isFirstLogin: true,
      joiningDate: parsedJoiningDate,
    });

    await user.save();

    // Send email with credentials
    let emailSent = false;
    try {
      await sendEmail({
        email: user.email,
        subject: "Your Mostech Business Solutions Account Credentials",
        html: `
          <h2>Welcome to Mostech Business Solutions</h2>
          <p>Your account has been created. Here are your login credentials:</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p><strong>Joining Date:</strong> ${user.joiningDate.toLocaleDateString()}</p>
          <p>Please login <a href="https://mostech.ae/time-tracker/">here</a> and change your password immediately.</p>
        `,
      });

      emailSent = true;
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't throw here - still want to return success for user creation
    }

    // Return success response
    return res.status(201).json({
      message: emailSent
        ? "Staff created successfully. Credentials sent to email."
        : "Staff created successfully but email could not be sent. Please contact admin.",
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        joiningDate: user.joiningDate,
      },
      tempPassword: !emailSent ? tempPassword : undefined, // Only send password if email failed
    });
  } catch (error) {
    console.error("Server error in createStaff:", error);

    // Check if this is a duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "User already exists (race condition)",
        error: "duplicate",
      });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Soft delete a staff member
// @route   DELETE /api/admin/staff/:id
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (staff.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin users" });
    }

    // Soft delete - mark as deleted
    staff.isActive = false;
    staff.inactivatedAt = new Date();
    await staff.save();

    res.json({
      success: true,
      message: "Staff member inactivated successfully",
      staff: {
        _id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    console.error("Error in deleteStaff:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Restore a soft-deleted staff member
// @route   PUT /api/admin/staff/:id/restore
const restoreStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (staff.isActive === true) {
      return res
        .status(400)
        .json({ message: "Staff member is not deactivated" });
    }

    // Restore - unmark deleted
    staff.isActive = true;
    staff.inactivatedAt = null;
    await staff.save();

    res.json({
      success: true,
      message: "Staff member restored successfully",
      staff: {
        _id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
      },
    });
  } catch (error) {
    console.error("Error in restoreStaff:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update staff member details
// @route   PUT /api/admin/staff/:id
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, joiningDate } = req.body;

    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (staff.role === "admin") {
      return res.status(403).json({ message: "Cannot modify admin users" });
    }

    // Update fields
    if (firstName) staff.firstName = firstName;
    if (lastName) staff.lastName = lastName;
    if (email) staff.email = email;
    if (joiningDate) {
      const parsedDate = new Date(joiningDate);
      parsedDate.setHours(0, 0, 0, 0);
      staff.joiningDate = parsedDate;
    }

    await staff.save();

    res.json({
      success: true,
      message: "Staff member updated successfully",
      staff: {
        _id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        joiningDate: staff.joiningDate,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    console.error("Error in updateStaff:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all staff (with filter for active/inactive)
// @route   GET /api/admin/staff?includeInactive=false
const getAllStaff = async (req, res) => {
  try {
    const { includeInactive = "false" } = req.query;

    // First, check total users in database
    const totalUsers = await User.countDocuments();

    const staffUsers = await User.countDocuments({ role: "staff" });

    const activeStaffUsers = await User.countDocuments({
      role: "staff",
      isActive: true,
    });

    const inactiveStaffUsers = await User.countDocuments({
      role: "staff",
      isActive: false,
    });

    const query = { role: "staff" };

    // Only show active staff by default
    if (includeInactive !== "true") {
      query.isActive = true;
    }

    const staff = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(staff);
  } catch (error) {
    console.error("Error in getAllStaff:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get monthly attendance report
// @route   GET /api/admin/reports/monthly
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, staffId } = req.query;

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Build query
    const query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (staffId && staffId !== "all") {
      query.userId = staffId;
    }

    // Get all attendance records - no day completion filter
    const attendance = await Attendance.find(query)
      .populate({
        path: "userId",
        select: "email firstName lastName",
        match: { role: "staff" },
      })
      .sort({ date: -1, "userId.firstName": 1 });

    // Filter out records where userId is null (deleted users)
    const validAttendance = attendance.filter(
      (record) => record.userId !== null,
    );

    res.json(validAttendance);
  } catch (error) {
    console.error("Error in getMonthlyReport:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to check if a day is complete
const isDayCompleteCheck = (now, day, hour) => {
  // Sunday
  if (day === 0) return true; // Full day is complete (no work)

  // Saturday - day ends at 1 PM
  if (day === 6) {
    return hour >= 13; // Complete after 1 PM
  }

  // Weekday - day ends at 6 PM
  return hour >= 18; // Complete after 6 PM
};

// @desc    Get all leave requests
// @route   GET /api/admin/leaves
const getLeaveRequests = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("userId", "email firstName lastName")
      .sort({ createdAt: -1 })
      .select("-cloudinaryPublicId");

    res.json(leaves);
  } catch (error) {
    console.error("Error in getLeaveRequests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update leave status
// @route   PUT /api/admin/leaves/:id
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id).populate("userId");

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = status;
    if (status === "rejected") {
      leave.rejectionReason = rejectionReason;
    }
    await leave.save();

    // Format date range for email
    const dateRange =
      leave.startDate && leave.endDate
        ? `${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}`
        : new Date(leave.date).toLocaleDateString();

    // Send email notification
    const emailSubject =
      status === "approved"
        ? "Leave Request Approved"
        : "Leave Request Rejected";

    const emailHtml =
      status === "approved"
        ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #020c4c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .approved { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; }
          .screenshot-link { margin-top: 15px; }
          .screenshot-link a { color: #020c4c; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Approved</h1>
          </div>
          <div class="content">
            <div class="approved">
              <p>Your leave request for <strong>${dateRange}</strong> has been <strong>APPROVED</strong>.</p>
              <p><strong>Total Leave Days:</strong> ${leave.leaveDays} day${leave.leaveDays !== 1 ? "s" : ""}</p>
            </div>
            <div class="screenshot-link">
              <p>Your uploaded screenshot: <a href="${leave.emailScreenshot}" target="_blank">View Image</a></p>
            </div>
            <p>Have a great time off!</p>
            <p>Best regards,<br>Mostech Business Solutions Team</p>
          </div>
        </div>
      </body>
      </html>
    `
        : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #020c4c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .rejected { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Rejected</h1>
          </div>
          <div class="content">
            <div class="rejected">
              <p>Your leave request for <strong>${dateRange}</strong> has been <strong>REJECTED</strong>.</p>
              <p><strong>Requested Days:</strong> ${leave.leaveDays} day${leave.leaveDays !== 1 ? "s" : ""}</p>
              ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
            </div>
            <p>Please contact your manager if you have any questions.</p>
            <p>Best regards,<br>Mostech Business Solutions Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      email: leave.userId.email,
      subject: emailSubject,
      html: emailHtml,
    });

    // Remove sensitive data before sending response
    const leaveResponse = leave.toObject();
    delete leaveResponse.cloudinaryPublicId;

    res.json({
      success: true,
      message: `Leave request ${status}`,
      leave: leaveResponse,
    });
  } catch (error) {
    console.error("Error in updateLeaveStatus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete old rejected leaves (cron job - optional)
// @route   DELETE /api/admin/leaves/cleanup
const cleanupOldRejectedLeaves = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find rejected leaves older than 30 days
    const oldLeaves = await Leave.find({
      status: "rejected",
      createdAt: { $lt: thirtyDaysAgo },
    });

    // Delete images from Cloudinary
    for (const leave of oldLeaves) {
      if (leave.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(leave.cloudinaryPublicId);
      }
    }

    // Delete records from database
    const result = await Leave.deleteMany({
      status: "rejected",
      createdAt: { $lt: thirtyDaysAgo },
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} old rejected leaves`,
    });
  } catch (error) {
    console.error("Error in cleanupOldRejectedLeaves:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // Get total staff count (active only)
    const totalStaff = await User.countDocuments({
      role: "staff",
      isActive: true,
    });

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all today's attendance records
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // Count punched in today (anyone who has punchIn today)
    const punchedInToday = todayAttendance.filter(
      (record) => record.punchIn,
    ).length;

    // Count currently working (punched in but not punched out) - THIS IS THE KEY
    const currentlyWorking = todayAttendance.filter(
      (record) => record.punchIn && !record.punchOut,
    ).length;

    // Get pending leave requests count
    const pendingLeaves = await Leave.countDocuments({ status: "pending" });

    // Get recent activity (last 5 attendance records)
    const recentActivity = await Attendance.find()
      .populate("userId", "firstName lastName email")
      .sort({ date: -1 })
      .limit(5)
      .select("userId date status totalWorkedHours punchIn punchOut");

    // Get leave requests summary
    const leaveSummary = await Leave.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format leave summary
    const leaveStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    leaveSummary.forEach((item) => {
      leaveStats[item._id] = item.count;
    });

    console.log("Dashboard Stats:", {
      totalStaff,
      punchedInToday,
      currentlyWorking, 
      pendingLeaves,
    });

    res.json({
      totalStaff,
      presentToday: punchedInToday,
      activeNow: currentlyWorking,
      pendingLeaves,
      leaveStats,
      recentActivity,
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get attendance summary for chart
// @route   GET /api/admin/dashboard/attendance-summary
const getAttendanceSummary = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days);

    const endDate = new Date();
    const startDate = new Date();

    if (daysNum === 1) {
      // For today, start from today 00:00:00
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setDate(startDate.getDate() - daysNum);
    }

    // Get all attendance records for the period and populate user role
    const attendance = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).populate("userId", "role");

    // Filter to only staff members
    const staffAttendance = attendance.filter(
      (record) => record.userId && record.userId.role === "staff",
    );

    // Get today's date for live adjustment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's active working records for staff only
    const todayRecords = staffAttendance.filter((record) => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

    const currentlyWorking = todayRecords.filter(
      (r) => r.punchIn && !r.punchOut,
    ).length;

    // Group by date
    const summary = [];
    const dateMap = new Map();

    staffAttendance.forEach((record) => {
      const dateStr = record.date.toISOString().split("T")[0];
      const isToday = dateStr === today.toISOString().split("T")[0];

      let status = record.status;
      // If it's today and still working, count as working (NOT present)
      if (isToday && record.punchIn && !record.punchOut) {
        status = "working";
      }

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          present: 0,
          absent: 0,
          "half-day": 0,
          working: 0,
        });
      }

      const dayData = dateMap.get(dateStr);
      if (status === "present") dayData.present++;
      else if (status === "half-day") dayData["half-day"]++;
      else if (status === "absent") dayData.absent++;
      else if (status === "working") dayData.working++;
    });

    // Convert to array and sort by date
    dateMap.forEach((value, key) => {
      summary.push(value);
    });
    summary.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Format for chart
    const formattedSummary = summary.map((item) => ({
      date: item.date,
      present: item.present,
      absent: item.absent,
      "half-day": item["half-day"],
      working: item.working,
    }));

    res.json(formattedSummary);
  } catch (error) {
    console.error("Error getting attendance summary:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get live attendance for today
// @route   GET /api/admin/reports/live
const getLiveAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate("userId", "email firstName lastName role")
      .sort({ "userId.firstName": 1 });

    // Filter out admin users from the records
    const filteredAttendance = attendance.filter((record) => {
      // Only include staff members (not admin)
      return record.userId && record.userId.role === "staff";
    });

    // Calculate current status for each record
    const now = new Date();
    const liveData = filteredAttendance.map((record) => {
      const recordObj = record.toObject();

      // Check if currently punched in and not punched out
      const isActive = record.punchIn && !record.punchOut;

      // Determine display status
      let displayStatus = record.status;
      if (isActive) {
        displayStatus = "working";
      }

      return {
        ...recordObj,
        isActive: isActive,
        displayStatus: displayStatus,
      };
    });

    res.json({
      date: today.toLocaleDateString(),
      records: liveData,
      isComplete: isDayCompleteCheck(now, now.getDay(), now.getHours()),
    });
  } catch (error) {
    console.error("Error in getLiveAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Auto-approve pending leave requests older than 2 days
// @route   POST /api/admin/leaves/auto-approve
const autoApproveLeaves = async (req, res) => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find pending leaves that are older than 2 days
    const pendingLeaves = await Leave.find({
      status: "pending",
      createdAt: { $lt: twoDaysAgo },
    }).populate("userId", "email firstName lastName");

    const autoApproved = [];
    const autoApprovedIds = [];

    for (const leave of pendingLeaves) {
      leave.status = "approved";
      leave.autoApproved = true;
      leave.autoApprovedAt = new Date();
      await leave.save();

      autoApproved.push(leave);
      autoApprovedIds.push(leave._id);

      // Send notification to staff about auto-approval
      await sendEmail({
        email: leave.userId.email,
        subject: "Leave Request Auto-Approved",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #020c4c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { padding: 20px; background: #f9f9f9; border: 1px solid #ddd; }
              .approved { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; }
              .info { background: #e7f3ff; color: #0066cc; padding: 10px; border-radius: 4px; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Leave Request Auto-Approved</h1>
              </div>
              <div class="content">
                <div class="approved">
                  <p>Your leave request for <strong>${new Date(leave.date).toLocaleDateString()}</strong> has been <strong>AUTO-APPROVED</strong>.</p>
                </div>
                <p><strong>Reason:</strong> ${leave.reason}</p>
                <div class="info">
                  <p>ℹ️ This request was automatically approved after 2 days as no action was taken by the admin.</p>
                </div>
                <p>Enjoy your time off!</p>
                <p>Best regards,<br>Mostech Business Solutions Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    }

    // If there were auto-approved leaves, notify admin
    if (autoApproved.length > 0) {
      // Find admin users
      const admins = await User.find({ role: "admin" });

      // Create admin notification email
      const adminEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #020c4c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .alert { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; }
            .leave-item { background: white; padding: 10px; margin: 10px 0; border-left: 3px solid #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Auto-Approval Notification</h1>
            </div>
            <div class="content">
              <div class="alert">
                <p><strong>⚠️ Attention Admin:</strong> The following leave requests were automatically approved due to no action within 2 days:</p>
              </div>
              
              ${autoApproved
                .map(
                  (leave) => `
                <div class="leave-item">
                  <p><strong>Staff:</strong> ${leave.userId.firstName} ${leave.userId.lastName}</p>
                  <p><strong>Email:</strong> ${leave.userId.email}</p>
                  <p><strong>Date:</strong> ${new Date(leave.date).toLocaleDateString()}</p>
                  <p><strong>Reason:</strong> ${leave.reason}</p>
                  <p><strong>Requested on:</strong> ${new Date(leave.createdAt).toLocaleDateString()}</p>
                </div>
              `,
                )
                .join("")}
              
              <p style="margin-top: 20px;">Please review these auto-approved requests and take note for future reference.</p>
              <p><a href="${process.env.FRONTEND_URL}/admin/leaves" style="background: #020c4c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View All Leaves</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send notification to all admins
      for (const admin of admins) {
        await sendEmail({
          email: admin.email,
          subject: `[Auto-Approval] ${autoApproved.length} Leave Request(s) Auto-Approved`,
          html: adminEmailHtml,
        });
      }
    }

    res.json({
      success: true,
      message: `Auto-approved ${autoApproved.length} leave requests`,
      autoApproved: autoApproved.map((l) => ({
        id: l._id,
        staff: `${l.userId.firstName} ${l.userId.lastName}`,
        date: l.date,
      })),
    });
  } catch (error) {
    console.error("Error in autoApproveLeaves:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get pending leaves that are about to expire (1 day left)
// @route   GET /api/admin/leaves/pending-expiring
const getPendingExpiringLeaves = async (req, res) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const expiringLeaves = await Leave.find({
      status: "pending",
      createdAt: {
        $gte: oneDayAgo,
        $lt: twoDaysAgo,
      },
    }).populate("userId", "email firstName lastName");

    res.json(expiringLeaves);
  } catch (error) {
    console.error("Error in getPendingExpiringLeaves:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get attendance report for custom date range
// @route   GET /api/admin/reports/custom
const getCustomDateReport = async (req, res) => {
  try {
    const { startDate, endDate, staffId } = req.query;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const query = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    if (staffId && staffId !== "all") {
      query.userId = staffId;
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: "userId",
        select: "email firstName lastName",
        match: { role: "staff" },
      })
      .sort({ date: -1, "userId.firstName": 1 });

    const validAttendance = attendance.filter(
      (record) => record.userId !== null,
    );

    res.json(validAttendance);
  } catch (error) {
    console.error("Error in getCustomDateReport:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Hard delete a staff member
// @route   DELETE /api/admin/staff/:id/hard
const hardDeleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (staff.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin users" });
    }

    await User.findByIdAndDelete(id);
    // Optional: Delete associated records
    await Attendance.deleteMany({ userId: id });
    await Leave.deleteMany({ userId: id });

    res.json({ success: true, message: "Staff member permanently deleted" });
  } catch (error) {
    console.error("Error in hardDeleteStaff:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update attendance record
// @route   PUT /api/admin/attendance/:id
const updateAttendance = async (req, res) => {
  try {
    const { punchIn, punchOut, status } = req.body;
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (punchIn) attendance.punchIn = new Date(punchIn);
    if (punchOut) attendance.punchOut = new Date(punchOut);
    if (status) attendance.status = status;

    // The pre-save hook in Attendance model will handle calculations
    await attendance.save();

    res.json({
      success: true,
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in updateAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add manual attendance record
// @route   POST /api/admin/attendance
const addAttendance = async (req, res) => {
  try {
    const { userId, date, punchIn, punchOut, status } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Check if attendance already exists for this date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const tomorrow = new Date(attendanceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: attendanceDate,
        $lt: tomorrow,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "Attendance record already exists for this date" });
    }

    const attendance = new Attendance({
      userId,
      date: attendanceDate,
      punchIn: punchIn ? new Date(punchIn) : null,
      punchOut: punchOut ? new Date(punchOut) : null,
      status: status || 'absent'
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: "Attendance record added successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in addAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/admin/attendance/:id
const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createStaff,
  deleteStaff,
  restoreStaff,
  updateStaff,
  getAllStaff,
  getMonthlyReport,
  getLeaveRequests,
  updateLeaveStatus,
  getDashboardStats,
  getAttendanceSummary,
  cleanupOldRejectedLeaves,
  getLiveAttendance,
  autoApproveLeaves,
  getPendingExpiringLeaves,
  getCustomDateReport,
  hardDeleteStaff,
  updateAttendance,
  deleteAttendance,
  addAttendance,
};
