import axios from "axios";
import React, { useEffect, useState } from "react";
import { useOrder } from "../Context/OrderContext";
import "./SupplierNotifications.css"; //  Import CSS
import { useUser } from "../Context/UserContext";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import AllergyIcon from "./icons/AllergyIcon";

const SupplierNotifications = () => {
  const { buyer_id, order_id } = useUser();
  const { orderDetails, setOrderDetails } = useOrder();
  const [supplierPrices, setSupplierPrices] = useState({});

  useEffect(() => {
    const getOrders = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/notificationOrders/${buyer_id}/${order_id}/`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );

        console.log(`Fetched Orders for buyer ${buyer_id}:`, response.data);
        // Directly use data from API which now includes allergy_info
        setOrderDetails(response.data.orders);
      } catch (error) {
        console.log("Error fetching orders:", error);
      }
    };

    getOrders();
  }, []);

  const handlePriceChange = (orderId, itemId, value) => {
    setSupplierPrices((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemId]: parseFloat(value) || 0,
      },
    }));
  };

  const calculateOrderTotal = (orderId) => {
    const order = supplierPrices[orderId];
    if (!order) return 0;
    return Object.values(order)
      .reduce((sum, val) => sum + val, 0)
      .toFixed(2);
  };

  // SENDS NOTIFICATIONS TO BUYERS IN THEIR NOTIFICATION SECTION
  const handleSubmitPrices = async (orderId) => {
    const prices = supplierPrices[orderId];

    if (!prices) {
      return showErrorToast("Please enter prices before submitting.");
    }

    // Update orderDetails by embedding supplierPrices into the specific order
    const updatedOrders = orderDetails.map((order) => {
      if (order.order_id === orderId) {
        return {
          ...order,
          supplier_price: supplierPrices, // ✅ Add supplierPrices into the order
        };
      }
      return order;
    });

    // Update the context state
    setOrderDetails(updatedOrders);

    const estimatedDeliveryTime = new Date(); // gets current PC date & time

    try {
      await axios.post(
        `http://localhost:8000/api/orders/${orderId}/offers/`,
        {
          order_id: orderId, // Add order_id
          price: parseFloat(calculateOrderTotal(orderId)), // Send total price only
          estimated_delivery_time: estimatedDeliveryTime.toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      showSuccessToast(`Prices for Order ${orderId} submitted successfully!`);
    } catch (error) {
      console.error("Error submitting supplier prices:", error);
      showErrorToast("Error submitting prices. Please try again.");
    }
  };

  return (
    <div className="notifications-container">
      <h2 className="notifications-title">📦 Supplier Notifications</h2>
      {Array.isArray(orderDetails) && orderDetails.length > 0 ? (
        orderDetails.map((order, index) => (
          <div key={index} className="order-card">
            <h3 className="order-header">🛒 Order #{order.order_id}</h3>
            <p>
              <strong>Buyer:</strong> {order.buyer_username} (ID:{" "}
              {order.buyer_id})
            </p>
            <p>
              <strong>Status:</strong> {order.order_status}
            </p>
            <p>
              <strong>Sent At:</strong>{" "}
              {new Date(order.sent_at).toLocaleString()}
            </p>

            <h4 style={{ marginTop: "1rem" }}>Items</h4>
            <ul className="item-list">
              {order.items.map((item, idx) => (
                <li key={idx} className="item-card">
                  <p>
                    <strong>Item:</strong> 
                    <span className="item-title-container">
                      <span className="item-name">{item.item_name}</span>
                      <AllergyIcon allergyInfo={item.allergy_info} />
                    </span>
                  </p>
                  <p>
                    <strong>Quantity:</strong> {item.quantity}
                  </p>
                  <p>
                    <strong>Original Total Price:</strong> £
                    {item.item_total_price}
                  </p>
                  <div className="price-input-wrapper">
                    <label>
                      <strong>Your Price:</strong>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Enter your price"
                      value={
                        supplierPrices[order.order_id]?.[item.order_item_id] ||
                        ""
                      }
                      onChange={(e) =>
                        handlePriceChange(
                          order.order_id,
                          item.order_item_id,
                          e.target.value
                        )
                      }
                      className="price-input"
                    />
                  </div>
                </li>
              ))}
            </ul>

            <p className="total-price">
              💰 Total Your Price: £{calculateOrderTotal(order.order_id)}
            </p>
            <button
              onClick={() => handleSubmitPrices(order.order_id)}
              className="submit-button"
            >
              Submit Prices
            </button>
          </div>
        ))
      ) : (
        <p>No orders yet.</p>
      )}
    </div>
  );
};

export default SupplierNotifications;
