// import React, { useEffect } from 'react';
// import { useOrder } from '../Context/OrderContext';
import './SupplierNotifications.css'; // Reuse styling from SupplierNotifications

const BuyerNotification = () => {

  // const { orderDetails, setOrderDetails } = useOrder();

  // useEffect(() => {
  //   const storedOrders = localStorage.getItem('orderDetails');
  //   if (storedOrders) {
  //     setOrderDetails(JSON.parse(storedOrders));
  //   }
  // }, [setOrderDetails]); // Dependency added

  return (
    <div className="notifications-container">
      <h2 className="notifications-title">📨 Buyer Notifications</h2>
      {/* {Array.isArray(orderDetails) && orderDetails.length > 0 ? (
        orderDetails.map((order, index) => (
          <div key={index} className="order-card">
            <h3 className="order-header">🛒 Order #{order.order_id}</h3>
            <p><strong>Buyer:</strong> {order.buyer_username} (ID: {order.buyer_id})</p>

            <h4 style={{ marginTop: '1rem' }}>Items</h4>
            <ul className="item-list">
              {order.items.map((item, idx) => (
                <li key={idx} className="item-card">
                  <p><strong>Item:</strong> {item.item_name}</p>
                  <p><strong>Quantity:</strong> {item.quantity}</p>
                  <p><strong>Original Total Price:</strong> £{item.item_total_price}</p>
                  <p><strong>Supplier Offer:</strong> £
                    {order.supplier_price?.[item.order_item_id] ?? 'Not offered yet'}
                  </p>
                </li>
              ))}
            </ul> */}

            {/* <p className="total-price">
              💰 Total Offer: £
              {order.supplier_price
                ? Object.values(order.supplier_price).reduce((sum, price) => sum + parseFloat(price), 0).toFixed(2)
                : '0.00'}
            </p>

            <button className="submit-button">Approve</button>
          </div>
        ))
      ) : (
        <p>No offers yet.</p>
      )} */}
    </div>
  );
};

export default BuyerNotification;
