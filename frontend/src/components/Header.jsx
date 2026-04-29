/* eslint-disable react-hooks/static-components */
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  DocumentTextIcon,
  LogoutIcon,
  UserCircleIcon,
  MenuIcon,
  XIcon,
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  CalendarIcon,
  ClipboardListIcon,
  UserIcon,
  ClockIcon,
} from "@heroicons/react/outline";
import ConfirmModal from "./resuable/ConfirmModal";
import logo from "../assets/logo.png";

const Header = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [location]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const logoutConfirm = () => {
    setShowLogoutConfirm(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const Logo = () => (
    <div className="flex items-center">
      <img
        src={logo}
        alt="Mostech Business Solutions"
        className="h-10 w-auto md:h-12"
      />
    </div>
  );

  // Get navigation items based on role
  const getNavItems = () => {
    if (user?.role === "admin") {
      return [
        { path: "/admin", name: "Dashboard", icon: HomeIcon },
        { path: "/admin/staff", name: "Staff", icon: UsersIcon },
        { path: "/admin/attendance", name: "Attendance", icon: ClockIcon },
        { path: "/admin/reports", name: "Reports", icon: ChartBarIcon },
        { path: "/admin/leaves", name: "Leaves", icon: CalendarIcon },
        { path: "/admin/staff-reports", name: "Daily Reports", icon: ClipboardListIcon },
      ];
    }
    return [
      { path: "/staff", name: "Dashboard", icon: HomeIcon },
      { path: "/staff/leave", name: "Leave Request", icon: CalendarIcon },
      { path: "/staff/profile", name: "Profile", icon: UserIcon },
      { path: "/staff/daily-reports", name: "Daily Reports", icon: ClipboardListIcon },
    ];
  };

  const navItems = user ? getNavItems() : [];

  return (
    <>
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo Section */}
            <div className="flex items-center">
              <Link
                to={user ? (user.role === "admin" ? "/admin" : "/staff") : "/"}
                className="flex items-center"
              >
                <Logo />
              </Link>
            </div>

            {/* Desktop Navigation */}
            {user && (
              <>
                <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
                  {navItems.map((item) => (
                    <NavLink key={item.path} to={item.path} icon={item.icon}>
                      {item.name}
                    </NavLink>
                  ))}
                </nav>

                {/* Desktop User Section */}
                <div className="hidden md:flex items-center space-x-4">
                  {user.role !== "admin" && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-full">
                      {user.profileImage &&
                      user.profileImage !== "default-profile.png" ? (
                        <img
                          src={user.profileImage}
                          alt="Profile"
                          className="h-6 w-6 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <UserCircleIcon className="h-6 w-6 text-blue-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {user.email}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={logoutConfirm}
                    className="flex items-center space-x-2 px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all duration-200"
                  >
                    <LogoutIcon className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={toggleMobileMenu}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <XIcon className="h-6 w-6 text-gray-700" />
                  ) : (
                    <MenuIcon className="h-6 w-6 text-gray-700" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {user && isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bg-white shadow-xl z-40 md:hidden animate-slideDown">
            <div className="flex flex-col">
              {/* User Profile Section */}
              <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center">
                    {user.profileImage && user.profileImage !== "default-profile.png" ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="h-12 w-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 break-all">
                      {user.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-3 px-6 py-3 transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                      <span className={`font-medium ${isActive ? "text-blue-600" : "text-gray-700"}`}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Logout Button */}
              <div className="border-t border-gray-200 py-4 px-6">
                <button
                  onClick={logoutConfirm}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200"
                >
                  <LogoutIcon className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Confirm Logging out"
        message="Are you sure you want to logout?"
      />
    </>
  );
};

// NavLink component for desktop
const NavLink = ({ to, children, icon: Icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </Link>
  );
};

export default Header;