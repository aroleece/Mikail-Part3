import React, { useEffect, useState } from "react";
import axios from "axios";
import { useOrder } from "../Context/OrderContext";
import { useUser } from "../Context/UserContext";
import TruncatedNote from "./TruncatedNote";
import AllergyIcon from "./icons/AllergyIcon";

const SupplierProfile = () => {
  const { username, userEmail, userPassword } = useUser();
  const { orderDetails, setOrderDetails } = useOrder();
  const [userId, setUserId] = useState(null);
  
  // State for modal and bid management
  const [modalOpen, setModalOpen] = useState(false);
  const [bids, setBids] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showToast, setShowToast] = useState(false);
  
  // State for buyer addresses
  const [buyerAddresses, setBuyerAddresses] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(5);
  const [pageCount, setPageCount] = useState(0);

  // Modal controls
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);
  
  // Show toast message
  const showToastMessage = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
  // Fetch all available orders
  const getOrders = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/all-orders/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      
      // Sort orders in descending order (newest first)
      const sortedOrders = response.data.orders.sort((a, b) => b.order_id - a.order_id);
      
      // Initialize bids for each order
      const initialBids = {};
      sortedOrders.forEach(order => {
        // Check if we have my_item_bids from the API response
        if (order.my_item_bids && Object.keys(order.my_item_bids).length > 0) {
          // Use the existing bids from the API (these should only be from active offers)
          initialBids[order.order_id] = order.my_item_bids;
        } else {
          // Default to buyer's price if no bids exist
          const orderBids = {};
          order.items.forEach(item => {
            orderBids[item.order_item_id] = item.item_total_price;
          });
          initialBids[order.order_id] = orderBids;
        }
      });
      
      setBids(initialBids);
      setOrderDetails(sortedOrders);
      setPageCount(Math.ceil(sortedOrders.length / ordersPerPage));
      
      // Fetch addresses for each buyer
      fetchBuyerAddresses(sortedOrders);
    } catch (error) {
      console.log("Error fetching orders:", error);
      setMessage("Failed to fetch orders");
      setMessageType("error");
      showToastMessage();
    }
  };
  
  // Fetch addresses for all buyers
  const fetchBuyerAddresses = async (orders) => {
    const token = localStorage.getItem("access_token");
    const buyerIds = [...new Set(orders.map(order => order.buyer_id))];
    
    try {
      const addresses = {};
      
      // Only add addresses that actually exist in the order data
      for (const order of orders) {
        if (order.buyer_address && order.buyer_address.trim() !== '') {
          addresses[order.buyer_id] = order.buyer_address;
        }
        // Don't set a default - if no address exists, leave it undefined
      }
      
      setBuyerAddresses(addresses);
    } catch (error) {
      console.log("Error processing buyer addresses:", error);
    }
  };

  useEffect(() => {
    getOrders();
    fetchCurrentUserId();
  }, []);

  // Fetch current user's ID from the backend
  const fetchCurrentUserId = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await axios.get("http://localhost:8000/api/user-profile/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "Application/json",
        },
      });
      
      if (response.data.id) {
        setUserId(response.data.id);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Handle bid price changes
  const handleBidChange = (orderId, itemId, value) => {
    const updatedBids = { ...bids };
    updatedBids[orderId] = { ...updatedBids[orderId], [itemId]: value };
    setBids(updatedBids);
  };

  // Calculate grand total for an order
  const calculateGrandTotal = (orderId) => {
    if (!bids[orderId]) return 0;
    
    return Object.values(bids[orderId]).reduce((total, bidPrice) => {
      return total + parseFloat(bidPrice || 0);
    }, 0).toFixed(2);
  };

  // Submit bid price for an order
  const handleSubmitBid = async (e, orderId) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    
    try {
      const response = await axios.put(
        `http://localhost:8000/api/supplier-orders/${orderId}/confirm/`,
        {
          supplier_price: calculateGrandTotal(orderId),
          item_prices: bids[orderId]
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      
      if (response) {
        getOrders();
        // Check if this was an update or a new bid
        const hadPreviousBid = response.data.previous_bid_price !== null;
        const successMessage = hadPreviousBid 
          ? `Bid updated from £${response.data.previous_bid_price} to £${response.data.your_bid_price}`
          : "Bid submitted successfully!";
          
        setMessage(successMessage);
        setMessageType("success");
        showToastMessage();
      }
    } catch (error) {
      console.error("Error submitting bid:", error);
      setMessage("Failed to submit bid. Please try again.");
      setMessageType("error");
      showToastMessage();
    }
  };
  
  // Get current orders for pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orderDetails ? orderDetails.slice(indexOfFirstOrder, indexOfLastOrder) : [];
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Ensure that allergy_info is set properly for each item
  const ensureAllergyInfo = (items) => {
    return items.map(item => {
      // If allergy_info is undefined or null, try to extract it from item details or set default
      if (!item.allergy_info) {
        // Try different possible property names
        item.allergy_info = item.allergyInfo || 
                            item['Allergy Info'] || 
                            item.allergy || 
                            (item.item_details && item.item_details.allergy_info) || 
                            'No allergen information';
      }
      return item;
    });
  };
  
  // Process orders to ensure they have allergy info
  useEffect(() => {
    if (orderDetails && orderDetails.length > 0) {
      const processedOrders = orderDetails.map(order => {
        return {
          ...order,
          items: ensureAllergyInfo(order.items)
        };
      });
      setOrderDetails(processedOrders);
    }
  }, [orderDetails?.length]);
  
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
  
  // Check if order is available for bidding
  const isOrderBiddable = (status) => {
    return !status || status === "pending";
  };
  
  // Check if current supplier was selected for this order
  const isSelectedSupplier = (order) => {
    return userId && order.supplier_id === userId && order.status === "confirmed";
  };
  
  return (
    <div className="supplier-profile-container">
      <h2 className="profile-header">Supplier Profile: {username}</h2>
      
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
      </div>
      
      <div className="orders-section">
        <h3>Available Orders</h3>
        
        {!orderDetails || orderDetails.length === 0 ? (
          <p className="no-orders-message">There are no orders available at the moment.</p>
        ) : (
          <>
            <div className="orders-list">
              {currentOrders.map((order, index) => (
                <div key={order.order_id} className="order-item">
                  <div className="order-header">
                    <div className="order-id">Order #{order.order_id}</div>
                    <div className="order-status">
                      <span className={`status-label ${order.status || 'open'}`}>
                        {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Open to Bid'}
                      </span>
                      {isSelectedSupplier(order) && (
                        <span className="selected-supplier-badge">You were selected!</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="order-details">
                    <div className="order-metadata">
                      <div className="delivery-info">
                        <h4>Delivery Information</h4>
                        <p><strong>Buyer:</strong> {order.buyer_username || 'Unknown'}</p>
                        <p><strong>Status:</strong> <span className={`status-badge ${order.status || 'open'}`}>
                          {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Open to Bid'}
                        </span></p>
                        <p><strong>Date:</strong> {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not scheduled'}</p>
                        <p><strong>Note:</strong> <TruncatedNote note={order.note} /></p>
                      </div>
                      
                      {/* Only show address section if there's a valid address */}
                      {buyerAddresses[order.buyer_id] ? (
                        <div className="buyer-address">
                          <h4>Delivery Address</h4>
                          <div className="address-content">
                            {buyerAddresses[order.buyer_id]}
                          </div>
                        </div>
                      ) : (
                        <div className="buyer-address address-missing">
                          <h4>Delivery Address</h4>
                          <div className="address-content address-not-available">
                            <em>Buyer has not provided an address yet</em>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="orders-table-container">
                      <table className="orders-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price (per unit)</th>
                            <th>Buyer Total</th>
                            <th>Your Bid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.order_item_id}>
                              <td className="item-name-cell">
                                <div className="item-title-container">
                                  <span className="item-display-name">{item.item_name}</span>
                                  <div className="icon-container">
                                    <AllergyIcon allergyInfo={item.allergy_info} size="16px" />
                                  </div>
                                </div>
                              </td>
                              <td>{item.quantity}</td>
                              <td>£{item.buyer_price}</td>
                              <td>£{item.item_total_price}</td>
                              <td>
                                <input
                                  type="number"
                                  className="bid-input"
                                  value={bids[order.order_id]?.[item.order_item_id] || ""}
                                  onChange={(e) => handleBidChange(order.order_id, item.order_item_id, e.target.value)}
                                  step="0.01"
                                  min="0"
                                  disabled={!isOrderBiddable(order.status)}
                                />
                              </td>
                            </tr>
                          ))}
                          <tr className="grand-total-row">
                            <td colSpan="3" className="text-right"><strong>Grand Total:</strong></td>
                            <td>
                              <strong>
                                £{order.items.reduce((total, item) => total + parseFloat(item.item_total_price || 0), 0).toFixed(2)}
                              </strong>
                            </td>
                            <td>
                              <strong>
                                £{calculateGrandTotal(order.order_id)}
                              </strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="bid-actions">
                      <button 
                        className="submit-bid-button"
                        onClick={(e) => handleSubmitBid(e, order.order_id)}
                        disabled={!isOrderBiddable(order.status)}
                      >
                        {isOrderBiddable(order.status) ? 'Submit Bid' : 'Bidding Closed'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
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

export default SupplierProfile;
