import React, { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../Context/UserContext";
import { Link } from "react-router-dom";
import { useOrder } from "../Context/OrderContext";
import TruncatedNote from "./TruncatedNote";
import AllergyIcon from "./icons/AllergyIcon";

const BuyerProfile = () => {
  const { username, userEmail, userPassword } = useUser();
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success or error
  const [showToast, setShowToast] = useState(false);
  const [address, setAddress] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  
  // Order edit form fields
  const [noteInput, setNoteInput] = useState("");
  const [deliveryDateInput, setDeliveryDateInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [pageCount, setPageCount] = useState(0);

  // Define fetchOrders function outside of useEffect to access it globally
  const fetchOrders = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await axios.get("http://localhost:8000/api/orders/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "Application/json",
        },
      });
      
      // Sort orders by ID in descending order (newest first)
      const sortedOrders = response.data.orders.sort((a, b) => b.order_id - a.order_id);
      
      // Set default status to pending if not specified
      const ordersWithDefaultStatus = sortedOrders.map(order => ({
        ...order,
        status: order.status || "pending"
      }));
      
      setOrders(ordersWithDefaultStatus);
      setPageCount(Math.ceil(ordersWithDefaultStatus.length / ordersPerPage));
    } catch (error) {
      console.error("Error fetching orders:", error);
      setMessage("Failed to fetch orders.");
      setMessageType("error");
      showToastMessage();
    }
  };

  // Function to show toast message
  const showToastMessage = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Fetch orders and address when the component mounts
  useEffect(() => {
    fetchOrders();
    
    // Fetch address from backend only, no localStorage
    const fetchAddress = async () => {
      const token = localStorage.getItem("access_token");
      try {
        const response = await axios.get("http://localhost:8000/api/user-profile/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        });
        
        if (response.data.address) {
          setAddress(response.data.address);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    
    fetchAddress();
  }, []);

  // Start editing an order
  const handleEditOrder = (order) => {
    setEditingOrder(order.order_id);
    setNoteInput(order.note || "");
    
    // Format the date for the input if it exists
    setDeliveryDateInput(order.delivery_date || "");
    setStatusInput(order.status || "pending");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingOrder(null);
    setNoteInput("");
    setDeliveryDateInput("");
    setStatusInput("");
  };

  // Save order changes
  const handleSaveOrderChanges = async (orderId) => {
    const token = localStorage.getItem("access_token");
    
    // If status is being changed to confirmed and there are bids, use the lowest bid
    const order = orders.find(o => o.order_id === orderId);
    
    // Check if trying to confirm order but delivery date is not set
    if (statusInput === "confirmed" && !deliveryDateInput) {
      setMessage("Please set a delivery date before confirming the order.");
      setMessageType("error");
      showToastMessage();
      return;
    }
    
    // Check if trying to confirm order but address is not set
    if (statusInput === "confirmed") {
      try {
        // Fetch user profile to check for address
        const profileResponse = await axios.get("http://localhost:8000/api/user-profile/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        });
        
        if (!profileResponse.data.address || profileResponse.data.address.trim() === '') {
          setMessage("Please set your address before confirming an order.");
          setMessageType("error");
          showToastMessage();
          
          // Scroll to address section and highlight it
          setIsEditingAddress(true);
          document.getElementById("addressSection")?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setMessage("Failed to verify your address. Please try again.");
        setMessageType("error");
        showToastMessage();
        return;
      }
      
      // Check if trying to confirm order but there are no bids
      if (!order.lowest_bid) {
        setMessage("You cannot confirm an order without any bids. Please wait for suppliers to bid.");
        setMessageType("error");
        showToastMessage();
        return;
      }
    }
    
    // If the order has bids and status is being changed to confirmed, accept the lowest bid
    if (statusInput === "confirmed" && order?.lowest_bid && order.status !== "confirmed") {
      try {
        // Accept the lowest bid - also include the note
        await axios.put(
          `http://localhost:8000/api/orders/${orderId}/confirm/`,
          {
            delivery_date: deliveryDateInput,
            note: noteInput  // Include the note in the request
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "Application/json",
            },
          }
        );
        
        setMessage("Lowest bid accepted and order confirmed!");
        setMessageType("success");
        showToastMessage();
        
        // Reset editing state
        setEditingOrder(null);
        
        // Re-fetch orders to show the changes
        fetchOrders();
        return;
      } catch (error) {
        console.error("Error accepting bid:", error);
        // Display the error message from the server if available
        if (error.response && error.response.data && error.response.data.message) {
          setMessage(error.response.data.message);
        } else {
          setMessage("Failed to accept bid.");
        }
        setMessageType("error");
        showToastMessage();
        return;
      }
    }
    
    // If not accepting a bid, proceed with normal update
    // Format the date properly for the API
    const formattedData = {
      note: noteInput,
      status: statusInput
    };
    
    // Only include delivery_date if it's not empty
    if (deliveryDateInput) {
      formattedData.delivery_date = deliveryDateInput;
    }
    
    try {
      await axios.put(
        `http://localhost:8000/api/orders/${orderId}/update/`,
        formattedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setMessage("Order updated successfully!");
      setMessageType("success");
      showToastMessage();
      
      // Reset editing state
      setEditingOrder(null);
      
      // Re-fetch orders to show the changes
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      setMessage("Failed to update the order.");
      setMessageType("error");
      showToastMessage();
    }
  };

  // Update order status
  const handleStatusChange = async (orderId, status) => {
    // If changing status to confirmed, check for delivery date
    if (status === "confirmed") {
      const order = orders.find(o => o.order_id === orderId);
      if (!order.delivery_date) {
        setMessage("Please set a delivery date before confirming the order.");
        setMessageType("error");
        showToastMessage();
        return;
      }
      
      // Check if there are any bids for this order
      if (!order.lowest_bid) {
        setMessage("You cannot confirm an order without any bids. Please wait for suppliers to bid.");
        setMessageType("error");
        showToastMessage();
        return;
      }
      
      // Check if address is set - fetch from backend
      const token = localStorage.getItem("access_token");
      try {
        // Fetch user profile to check for address
        const profileResponse = await axios.get("http://localhost:8000/api/user-profile/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        });
        
        if (!profileResponse.data.address || profileResponse.data.address.trim() === '') {
          setMessage("Please set your address before confirming an order.");
          setMessageType("error");
          showToastMessage();
          
          // Scroll to address section and highlight it
          setIsEditingAddress(true);
          document.getElementById("addressSection")?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setMessage("Failed to verify your address. Please try again.");
        setMessageType("error");
        showToastMessage();
        return;
      }
    }
    
    const token = localStorage.getItem("access_token");
    try {
      await axios.put(
        `http://localhost:8000/api/orders/${orderId}/update/`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setMessage(`Order marked as ${status}!`);
      setMessageType("success");
      showToastMessage();
      
      // Re-fetch orders to show the updated status
      fetchOrders();
    } catch (error) {
      console.error(`Error marking order as ${status}:`, error);
      setMessage(`Failed to update order status.`);
      setMessageType("error");
      showToastMessage();
    }
  };

  // Handle order confirmation (shortcut function)
  const handleConfirmOrder = (orderId) => handleStatusChange(orderId, "confirmed");

  // Handle order rejection (shortcut function)
  const handleRejectOrder = (orderId) => handleStatusChange(orderId, "rejected");

  // Handle order hold (shortcut function)
  const handleHoldOrder = (orderId) => handleStatusChange(orderId, "hold");

  // Handle order deletion
  const handleDeleteOrder = async (orderId) => {
    // Ask for confirmation before deleting
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    const token = localStorage.getItem("access_token");
    try {
      await axios.delete(
        `http://localhost:8000/api/orders/${orderId}/delete/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setMessage("Order deleted successfully!");
      setMessageType("success");
      showToastMessage();
      
      // Re-fetch orders to update the UI
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      // Check for specific error messages from the API
      if (error.response && error.response.data && error.response.data.error) {
        setMessage(error.response.data.error);
      } else {
        setMessage("Failed to delete the order.");
      }
      setMessageType("error");
      showToastMessage();
    }
  };

  // Handle address save
  const handleSaveAddress = async () => {
    if (!address.trim()) {
      setMessage("Address cannot be empty");
      setMessageType("error");
      showToastMessage();
      return;
    }
    
    // Save address to backend only, no localStorage
    const token = localStorage.getItem("access_token");
    try {
      await axios.put(
        "http://localhost:8000/api/update-address/",
        { address },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      setIsSaved(true);
      setIsEditingAddress(false);
      setMessage("Address saved successfully!");
      setMessageType("success");
      showToastMessage();
      
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving address:", error);
      setMessage("Failed to save address to server.");
      setMessageType("error");
      showToastMessage();
    }
  };

  // Handle edit address
  const handleEditAddress = () => {
    setIsEditingAddress(true);
  };

  // Handle cancel edit address
  const handleCancelEditAddress = () => {
    // Fetch current address from backend instead of localStorage
    const fetchCurrentAddress = async () => {
      const token = localStorage.getItem("access_token");
      try {
        const response = await axios.get("http://localhost:8000/api/user-profile/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        });
        
        if (response.data.address) {
          setAddress(response.data.address);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    
    fetchCurrentAddress();
    setIsEditingAddress(false);
  };
  
  // Get current orders for pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Pagination component
  const Pagination = ({ pageCount, currentPage, paginate }) => {
    const pageNumbers = [];
    
    for (let i = 1; i <= pageCount; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="pagination-container">
        <ul className="pagination">
          {pageNumbers.map(number => (
            <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
              <button onClick={() => paginate(number)} className="page-link">
                {number}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="profile-container-revised">
      <h2 className="profile-header">Buyer Profile: {username}</h2>
      
      {showToast && (
        <div className={`toast-message ${messageType}`}>
          {message}
          <button className="toast-close" onClick={() => setShowToast(false)}>×</button>
        </div>
      )}
      
      <div className="profile-top-section">
        <div className="profile-info-section">
          <h3>Account Information</h3>
          <p>Email: {userEmail}</p>
          <p>Password: {userPassword}</p>
        </div>
        
        <div className="address-section-revised" id="addressSection">
          <h3>Address Information</h3>
          {isEditingAddress ? (
            <div className="address-input">
              <textarea
                placeholder="Enter your delivery address here"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows="4"
              />
              <div className="address-actions">
                <button 
                  className="save-address-btn"
                  onClick={handleSaveAddress}
                >
                  Save Address
                </button>
                <button 
                  className="cancel-edit-btn"
                  onClick={handleCancelEditAddress}
                >
                  Cancel
                </button>
              </div>
              {isSaved && <span className="saved-message">Address saved!</span>}
            </div>
          ) : (
            <div className="saved-address-display">
              {address ? (
                <>
                  <div className="address-content">{address}</div>
                  <button 
                    className="edit-address-btn"
                    onClick={handleEditAddress}
                  >
                    Edit Address
                  </button>
                </>
              ) : (
                <div className="no-address">
                  <p>No delivery address saved.</p>
                  <button 
                    className="add-address-btn"
                    onClick={handleEditAddress}
                  >
                    Add Address
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="orders-section">
        <h3>Your Orders</h3>
        
        {orders.length === 0 ? (
          <p className="no-orders-message">You have no orders yet. Orders will appear here once you make a purchase.</p>
        ) : (
          <>
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Supplier</th>
                    <th>Total Price</th>
                    <th>Lowest Bid</th>
                    <th>Delivery Date</th>
                    <th>Note</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order) => (
                    <React.Fragment key={order.order_id}>
                      <tr className={`order-row ${order.status}`}>
                        <td>{order.order_id}</td>
                        <td>{order.status === "confirmed" && order?.supplier?.username ? order.supplier.username : 'Not assigned'}</td>
                        <td>£{order.total_price}</td>
                        <td>
                          {order.lowest_bid ? (
                            <span>
                              £{order.lowest_bid.amount} by {order.lowest_bid.supplier_username}
                            </span>
                          ) : (
                            'No bids yet'
                          )}
                        </td>
                        <td>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not scheduled'}</td>
                        <td>
                          <TruncatedNote note={order.note} />
                        </td>
                        <td>
                          <span className={`status-label ${order.status}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="edit-order-btn"
                              onClick={() => handleEditOrder(order)}
                            >
                              Edit
                            </button>
                            {order.status === "pending" && (
                              <button 
                                className="delete-order-btn"
                                onClick={() => handleDeleteOrder(order.order_id)}
                                title="Delete this order"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {editingOrder === order.order_id && (
                        <tr className="edit-order-row">
                          <td colSpan="7" className="edit-order-container">
                            <div className="edit-order-form">
                              <div className="form-row">
                                <div className="form-group">
                                  <label>
                                    Delivery Date
                                    {statusInput === "confirmed" && <span className="required-field">*</span>}
                                  </label>
                                  <input 
                                    type="date" 
                                    value={deliveryDateInput} 
                                    onChange={(e) => setDeliveryDateInput(e.target.value)}
                                    className={statusInput === "confirmed" && !deliveryDateInput ? "input-error" : ""}
                                  />
                                  {statusInput === "confirmed" && !deliveryDateInput && 
                                    <div className="field-error-message">Required for confirmed orders</div>
                                  }
                                </div>
                                
                                <div className="form-group">
                                  <label>Status</label>
                                  <select 
                                    value={statusInput}
                                    onChange={(e) => setStatusInput(e.target.value)}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed" disabled={!order.lowest_bid}>
                                      Confirmed {!order.lowest_bid && '(Need bids first)'}
                                    </option>
                                    <option value="rejected">Rejected</option>
                                    <option value="hold">On Hold</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div className="form-row">
                                <div className="form-group full-width">
                                  <label>Note</label>
                                  <div className="note-input-container">
                                    <textarea 
                                      value={noteInput} 
                                      onChange={(e) => setNoteInput(e.target.value)}
                                      placeholder="Add a note about this order"
                                      rows="4"
                                      className="note-textarea"
                                    />
                                    <div className="note-character-count">
                                      <span className={noteInput.length > 500 ? "count-warning" : ""}>
                                        {noteInput.length}/1000
                                      </span>
                                    </div>
                                  </div>
                                  <p className="note-help-text">
                                    Notes will be visible to the supplier. Longer notes will be truncated in the display but can be expanded.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Show bids info if there are any */}
                              {order.lowest_bid ? (
                                <div className="edit-row">
                                  <label>Current Bids</label>
                                  <div>
                                    <strong>Lowest Bid: £{order.lowest_bid.amount}</strong> by {order.lowest_bid.supplier_username}
                                    <p className="bid-info-text">
                                      To accept this bid, set the status to "Confirmed" and save changes.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="edit-row">
                                  <label>Current Bids</label>
                                  <div>
                                    <em>No bids yet. Please wait for suppliers to place bids.</em>
                                  </div>
                                </div>
                              )}
                              
                              <div className="form-actions">
                                <button 
                                  className="save-changes-btn"
                                  onClick={() => handleSaveOrderChanges(order.order_id)}
                                >
                                  Save Changes
                                </button>
                                <button 
                                  className="cancel-edit-btn"
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Render pagination if there are multiple pages */}
            {pageCount > 1 && (
              <Pagination 
                pageCount={pageCount} 
                currentPage={currentPage} 
                paginate={paginate} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BuyerProfile;
