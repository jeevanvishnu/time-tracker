const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  createStaff,
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
  updateStaff,
  deleteStaff,
  restoreStaff,
  getCustomDateReport,
  hardDeleteStaff,
  updateAttendance,
  deleteAttendance,
  addAttendance
} = require('../controllers/adminController');
const { getAllReports, getUserReports } = require('../controllers/reportController');

router.use(protect);
router.use(admin);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/attendance-summary', getAttendanceSummary);

// Staff management
router.post('/create-staff', createStaff);
router.get('/staff', getAllStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);
router.delete('/staff/:id/hard', hardDeleteStaff);
router.put('/staff/:id/restore', restoreStaff);

// Reports
router.get('/reports/monthly', getMonthlyReport);
router.get('/reports/custom', getCustomDateReport);
router.post('/attendance', addAttendance);
router.put('/attendance/:id', updateAttendance);
router.delete('/attendance/:id', deleteAttendance);
 
// Leave management
router.get('/leaves', getLeaveRequests);
router.put('/leaves/:id', updateLeaveStatus);
router.delete('/leaves/cleanup', cleanupOldRejectedLeaves); 
router.post('/leaves/auto-approve', autoApproveLeaves);
router.get('/leaves/pending-expiring', getPendingExpiringLeaves);

router.get('/reports', getAllReports);
router.get('/reports/live', getLiveAttendance);
router.get('/reports/user/:userId', getUserReports);

module.exports = router;