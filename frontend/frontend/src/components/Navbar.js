import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useUser } from "../Context/UserContext";
import { showSuccessToast } from "../utils/toast";

const Navbar = () => {
  const {
    setIsLoggedIn,
    username,
    setUsername,
    userRole,
    setUserRole,
    setUserEmail,
  } = useUser();
  
  const [unreadCount, setUnreadCount] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch unread notification count
    fetchUnreadCount();
    
    // Set up interval to refresh notification count every minute
    const interval = setInterval(fetchUnreadCount, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      
      const response = await axios.get(
        "http://localhost:8000/api/notifications/unread-count/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:8000/api/logout/",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUsername("");
      setUserRole("");
      setUserEmail("");
      setIsLoggedIn(false);
      showSuccessToast("You have been logged out successfully.");
      navigate("/login");
    } catch (error) {
      showSuccessToast("You have been logged out successfully.");
      navigate("/login");
      console.error(
        "Error logging out:",
        error.response?.data || error.message
      );
    }
  };

  return (
    <nav className="navbar">
      <div className="spacer"></div>
      
      <div className="nav-icons">
        {/* Menu Icon */}
        <Link to="/menu" className="nav-icon">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span className="icon-label">Menu</span>
        </Link>
        
        {/* Profile Icon */}
        <Link 
          to={userRole === "buyer" ? "/buyer-profile" : "/supplier-profile"} 
          className="nav-icon"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="icon-label">Profile</span>
        </Link>
        
        {/* Notification Icon */}
        <Link to="/notifications" className="nav-icon">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: 'red',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {unreadCount}
            </span>
          )}
          <span className="icon-label">Notifications</span>
        </Link>
        
        {/* Logout Icon */}
        <div className="nav-icon" onClick={handleLogout}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="icon-label">Logout</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
