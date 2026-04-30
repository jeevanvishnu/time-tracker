import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, EyeIcon, SearchIcon, FilterIcon, XIcon, CalendarIcon, UserIcon } from '@heroicons/react/outline';
import axiosInstance from '../../utils/axiosConfig';
import toast from 'react-hot-toast';
import ReportModal from '../../components/resuable/ReportModal';

const StaffReports = () => {
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [filters, setFilters] = useState({
    userId: 'all',
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStaff();
    fetchReports();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data } = await axiosInstance.get('/admin/staff');
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters).toString();
      const { data } = await axiosInstance.get(`/admin/reports?${params}`);
      setReports(data);
      setExpandedReport(null);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReports();
    setShowFilters(false);
  };

  const viewReport = (report) => {
    setSelectedReport({ ...report, editable: false });
    setShowReportModal(true);
  };

  const toggleReportExpand = (reportId) => {
    if (expandedReport === reportId) {
      setExpandedReport(null);
    } else {
      setExpandedReport(reportId);
    }
  };

  const clearFilters = () => {
    setFilters({
      userId: 'all',
      startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setTimeout(() => fetchReports(), 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStaffInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#020c4c' }} />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#020c4c' }}>
              Staff Daily Reports
            </h1>
          </div>
          
          {/* Stats Badge */}
          {reports.length > 0 && (
            <div className="px-3 py-1.5 bg-white rounded-lg shadow-sm">
              <span className="text-sm text-gray-600">
                Total Reports: <span className="font-semibold" style={{ color: '#020c4c' }}>{reports.length}</span>
              </span>
            </div>
          )}
        </div>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-md"
          >
            <div className="flex items-center space-x-2">
              <FilterIcon className="h-5 w-5" style={{ color: '#020c4c' }} />
              <span className="font-medium" style={{ color: '#020c4c' }}>Filter Reports</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {formatDate(filters.startDate)} - {formatDate(filters.endDate)}
              </span>
              {showFilters ? (
                <XIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <SearchIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </button>
        </div>

        {/* Filters Section - Responsive */}
        <div className={`${showFilters ? 'block' : 'hidden md:block'} mb-6 transition-all duration-300`}>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Staff Member
                  </label>
                  <select
                    name="userId"
                    value={filters.userId}
                    onChange={handleFilterChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="all">All Staff</option>
                    {staff.map(member => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    From Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                    onClick={(e) => e.target.showPicker?.()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    To Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                    onClick={(e) => e.target.showPicker?.()}
                  />
                </div>

                <div className="flex items-end space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                    }`}
                    style={{ background: '#020c4c' }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Searching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <SearchIcon className="h-4 w-4" />
                        <span>Search Reports</span>
                      </div>
                    )}
                  </button>
                  
                  {(filters.userId !== 'all' || 
                    filters.startDate !== new Date(new Date().setDate(1)).toISOString().split('T')[0] ||
                    filters.endDate !== new Date().toISOString().split('T')[0]) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-3 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                      title="Clear filters"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#020c4c' }}></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        )}

        {/* Reports Display - Desktop Table View */}
        {!loading && reports.length > 0 && (
          <>
            <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead style={{ background: '#020c4c' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Work Done
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Accomplishments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-xs font-medium">
                                {getStaffInitials(report.userId?.firstName, report.userId?.lastName)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {report.userId?.firstName} {report.userId?.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {report.userId?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(report.date)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 line-clamp-2 max-w-xs" title={report.workDone}>
                            {report.workDone}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 line-clamp-2 max-w-xs" title={report.accomplishments || 'N/A'}>
                            {report.accomplishments || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => viewReport(report)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                            title="View Full Report"
                          >
                            <EyeIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tablet and Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {reports.map((report) => (
                <div key={report._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {getStaffInitials(report.userId?.firstName, report.userId?.lastName)}
                          </span>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {report.userId?.firstName} {report.userId?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {report.userId?.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => viewReport(report)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Report"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Report Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Date:</span>
                        <span className="text-gray-700 font-medium">
                          {formatDate(report.date)}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Work Done:</p>
                        <p className="text-sm text-gray-700">
                          {report.workDone.length > 100 && expandedReport !== report._id 
                            ? `${report.workDone.substring(0, 100)}...` 
                            : report.workDone}
                          {report.workDone.length > 100 && (
                            <button
                              onClick={() => toggleReportExpand(report._id)}
                              className="text-blue-600 text-xs ml-1 font-medium"
                            >
                              {expandedReport === report._id ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </p>
                      </div>

                      {report.accomplishments && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Accomplishments:</p>
                          <p className="text-sm text-gray-700">
                            {report.accomplishments.length > 100 && expandedReport !== report._id 
                              ? `${report.accomplishments.substring(0, 100)}...` 
                              : report.accomplishments}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">No reports found</p>
            <p className="text-xs text-gray-400 mt-2">
              Try adjusting your search filters or select a different date range
            </p>
            {(filters.userId !== 'all' || 
              filters.startDate !== new Date(new Date().setDate(1)).toISOString().split('T')[0] ||
              filters.endDate !== new Date().toISOString().split('T')[0]) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: '#020c4c' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && reports.length > 0 && (
          <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
            Showing {reports.length} report{reports.length !== 1 ? 's' : ''}
            {filters.userId !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs">
                Filtered by staff
              </span>
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        date={selectedReport?.date}
        existingReport={selectedReport}
        onSubmit={async () => {}} // No submit in view mode
      />
    </div>
  );
};

export default StaffReports;