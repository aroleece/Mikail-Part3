import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../Context/UserContext";
import { Link } from "react-router-dom";
import "../notification-styles.css"; // Import dedicated CSS file

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userRole } = useUser();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const notificationsPerPage = 10; // Display 10 notifications per page
  
  useEffect(() => {
    fetchNotifications();
  }, [currentPage]);
  
  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    
    try {
      const response = await axios.get(
        `http://localhost:8000/api/notifications/?page=${currentPage}&limit=${notificationsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setNotifications(response.data.notifications);
      setTotalCount(response.data.total);
      setTotalPages(response.data.pages);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Failed to load notifications");
      setLoading(false);
    }
  };
  
  const formatNotification = (notification) => {
    // If there's a custom message provided, use it directly
    if (notification.message) {
      return notification.message;
    }

    // Fall back to generated messages based on type if no message is provided
    switch (notification.type) {
      case "new_order":
        return `New order #${notification.order_id} available`;
      
      case "new_bid":
        return `Supplier ${notification.supplier_name} bid £${notification.bid_amount} for order #${notification.order_id}`;
      
      case "bid_accepted":
        return `Your bid for order #${notification.order_id} was accepted`;
      
      case "order_update":
        const updateType = notification.data?.update_type;
        
        if (updateType === 'status') {
          return `Order #${notification.order_id} status changed to ${notification.data?.status || 'updated'}`;
        } else if (updateType === 'note') {
          return `Note updated for order #${notification.order_id}`;
        } else if (updateType === 'delivery_date') {
          const date = notification.data?.delivery_date 
            ? new Date(notification.data.delivery_date).toLocaleDateString() 
            : 'not set';
          return `Delivery date for order #${notification.order_id} changed to ${date}`;
        }
        
        return `Order #${notification.order_id} was updated`;
      
      case "order_status_change":
        // For backward compatibility with existing notifications
        return `Order #${notification.order_id} status changed to ${notification.data?.status || 'updated'}`;
        
      default:
        return `Notification: ${notification.type}`;
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
  
  const markAsRead = async (notificationId) => {
    const token = localStorage.getItem("access_token");
    
    try {
      await axios.put(
        `http://localhost:8000/api/notifications/${notificationId}/read/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      // Update the UI to show this notification as read
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  
  const markAllAsRead = async () => {
    const token = localStorage.getItem("access_token");
    
    try {
      await axios.put(
        `http://localhost:8000/api/notifications/read-all/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      // Update all notifications to read
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };
  
  if (loading) return <div className="notifications-loading">Loading notifications...</div>;
  if (error) return <div className="notifications-error">{error}</div>;
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="App">
      <div className="notifications-container-page">
        <div className="notifications-header">
          <h2>Notifications</h2>
          {unreadCount > 0 && (
            <button className="mark-all-read" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>
        
        <div className="notifications-count">
          {unreadCount > 0 ? (
            <span className="unread-count">{unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}</span>
          ) : (
            <span className="all-read">All caught up!</span>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any notifications yet</p>
            <Link to="/menu" className="back-link">Back to Menu</Link>
          </div>
        ) : (
          <>
            <div className="simple-notifications-list">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="notification-info">
                    <p className="notification-text">{formatNotification(notification)}</p>
                    <span className="notification-time">{formatTime(notification.created_at)}</span>
                  </div>
                  {!notification.read && <span className="unread-dot"></span>}
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="simple-pagination">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="page-btn prev"
                >
                  Previous
                </button>
                
                <div className="pagination-numbers">
                  {renderPaginationNumbers()}
                </div>
                
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="page-btn next"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
  
  // Render pagination numbers with ellipsis for larger page counts
  function renderPaginationNumbers() {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are fewer than maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <button 
            key={i} 
            onClick={() => setCurrentPage(i)} 
            className={`page-number ${currentPage === i ? 'active' : ''}`}
          >
            {i}
          </button>
        );
      }
    } else {
      // Always show first page
      pageNumbers.push(
        <button 
          key={1} 
          onClick={() => setCurrentPage(1)} 
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
        >
          1
        </button>
      );
      
      // Determine range of visible page numbers
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, startPage + 2);
      
      // Adjust if we're near the end
      if (endPage === totalPages - 1) {
        startPage = Math.max(2, endPage - 2);
      }
      
      // Show ellipsis if needed before middle pages
      if (startPage > 2) {
        pageNumbers.push(<span key="ellipsis1" className="ellipsis">...</span>);
      }
      
      // Add middle page numbers
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <button 
            key={i} 
            onClick={() => setCurrentPage(i)} 
            className={`page-number ${currentPage === i ? 'active' : ''}`}
          >
            {i}
          </button>
        );
      }
      
      // Show ellipsis if needed before last page
      if (endPage < totalPages - 1) {
        pageNumbers.push(<span key="ellipsis2" className="ellipsis">...</span>);
      }
      
      // Always show last page
      if (totalPages > 1) {
        pageNumbers.push(
          <button 
            key={totalPages} 
            onClick={() => setCurrentPage(totalPages)} 
            className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
          >
            {totalPages}
          </button>
        );
      }
    }
    
    return pageNumbers;
  }
};

export default NotificationsPage; 