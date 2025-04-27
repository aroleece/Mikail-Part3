import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useUser } from "../Context/UserContext";

const Notifications = ({ limit = 10 }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userRole } = useUser();
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    
    try {
      const response = await axios.get(
        `http://localhost:8000/api/notifications/?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setNotifications(response.data.notifications);
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
  
  if (loading) return <div className="notifications-loading">Loading notifications...</div>;
  if (error) return <div className="notifications-error">{error}</div>;
  
  return (
    <div className="notifications-container">
      <h3>Recent Notifications</h3>
      
      {notifications.length === 0 ? (
        <p className="no-notifications">No new notifications</p>
      ) : (
        <>
          <ul className="notifications-list">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              >
                <div className="notification-content">
                  <p>{formatNotification(notification)}</p>
                  <span className="notification-time">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="view-all-container">
            <Link to="/notifications" className="view-all-link">
              View All Notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications; 