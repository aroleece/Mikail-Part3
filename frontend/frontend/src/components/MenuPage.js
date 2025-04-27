import React, { useState } from "react";
import axios from "axios"; // Import axios to make HTTP requests
import menuData from "../menu.json"; // Import the menu.json file
import { useUser } from "../Context/UserContext";
import "../styles.css";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import AllergyIcon from "./icons/AllergyIcon";

const MenuPage = () => {
  const { username, userRole, setbuyer_id, order_id, setOrder_id } = useUser();

  const [selectedCategory, setSelectedCategory] = useState("Popular Dish");
  const [cart, setCart] = useState([]);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [newItem, setNewItem] = useState({
    "Item Name": "",
    "Price (£)": "",
    "Allergy Info": "",
    "Spice Level (1-5)": 1,
    "Calories (per serving)": "",
    "Description": "",
    "Subcategory": "Popular Dish"
  });

  // Extract categories from menuData
  const categories = menuData.reduce((acc, item) => {
    if (!acc.includes(item.Subcategory)) {
      acc.push(item.Subcategory);
    }
    return acc;
  }, []);

  // Handle input change for new item form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: name === "Price (£)" || name === "Spice Level (1-5)" || name === "Calories (per serving)" 
        ? parseFloat(value) || 0 
        : value
    });
  };

  // Adding a custom item to cart
  const addItemToCart = (e) => {
    e.preventDefault();
    if (newItem["Item Name"].trim()) {
      const customItem = {
        id: Date.now(),
        name: newItem["Item Name"],
        quantity: 1,
        price: newItem["Price (£)"] || 0,
        description: newItem.Description || "",
        allergyInfo: newItem["Allergy Info"] || "None",
        spiceLevel: newItem["Spice Level (1-5)"] || 1,
        calories: newItem["Calories (per serving)"] || 0
      };
      
      setCart([...cart, customItem]);
      
      // Reset form
      setNewItem({
        "Item Name": "",
        "Price (£)": "",
        "Allergy Info": "",
        "Spice Level (1-5)": 1,
        "Calories (per serving)": "",
        "Description": "",
        "Subcategory": selectedCategory
      });
      
      setShowAddItemForm(false);
      showSuccessToast(`${customItem.name} added to cart`);
    }
  };

  // Update quantity for each item in cart
  const updateItemQuantity = (itemId, operation) => {
    setCart(
      cart
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity:
                  operation === "increase"
                    ? item.quantity + 1
                    : Math.max(item.quantity - 1, 0),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Filter items by category
  const itemsInCategory = menuData.filter(
    (item) => item.Subcategory === selectedCategory
  );

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = itemsInCategory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(itemsInCategory.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Handle category change - reset to first page when category changes
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  // Add item from menu to cart
  const addMenuItemToCart = (item) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.ID);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.ID
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...item,
          id: item.ID,
          quantity: 1,
          name: item["Item Name"],
          price: item["Price (£)"],
          description: item.Description,
          allergyInfo: item["Allergy Info"],
          spiceLevel: item["Spice Level (1-5)"],
          calories: item["Calories (per serving)"],
        },
      ]);
    }
    showSuccessToast(`${item["Item Name"]} added to cart`);
  };

  // Handle Send to Supplier action
  const handleSendToSupplier = async () => {
    const orderItems = cart.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      allergy_info: item.allergyInfo || "None", // Ensure allergy info is included
    }));

    const totalPrice = cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const token = localStorage.getItem("access_token");

    try {
      const response = await axios.post(
        "http://localhost:8000/api/orders/",
        {
          items: orderItems,
          total_price: totalPrice,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      console.log(response);
      const response2 = await axios.post(
        "http://localhost:8000/api/order-send-suppliers/",
        {},

        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "Application/json",
          },
        }
      );
      setbuyer_id(response2.data.buyer_id);
      setOrder_id(response2.data.order_id);
      console.log("Success:", response2.data.buyer_id);
      setCart([]);
      showSuccessToast("Order sent to supplier");
      console.log("Order sent to supplier:", response);
    } catch (error) {
      showErrorToast(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.response?.data?.messages?.[0]?.message ||
          "Something went wrong"
      );
    }
  };

  // Handle print label action
  const handlePrintLabel = () => {
    const printContent = cart
      .map(
        (item) => `
      <div>
        <h2>${item.name} - £${item.price}</h2>
        <p>Description: ${item.description}</p>
        <p>Allergy Info: ${item.allergyInfo}</p>
        <p>Spice Level: ${item.spiceLevel}</p>
        <p>Calories: ${item.calories}</p>
        <p>Quantity: ${item.quantity}</p>
      </div>
    `
      )
      .join("");

    const printWindow = window.open();
    printWindow.document.write(`
      <html>
        <head><title>Print Label</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();

    // Clear the cart after printing
    setTimeout(() => {
      setCart([]);
    }, 1000);
  };

  // Generate pagination controls
  const renderPaginationControls = () => {
    return (
      <div className="pagination-controls">
        <button 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          className="pagination-button"
        >
          Prev
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          className="pagination-button"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="menu-page">
      {/* Welcome Message */}
      <div className="welcome-message">
        <h2>Welcome back, {username}!</h2>
        <p>Browse our menu items, add them to your cart, and place your order.</p>
      </div>
      
      {/* Add Custom Item Button - Only show when form is not displayed */}
      {!showAddItemForm && (
        <div className="add-custom-item-container">
          <button
            className="add-custom-item-btn"
            onClick={() => setShowAddItemForm(true)}
          >
            Add Custom Item
          </button>
        </div>
      )}
      
      {/* Custom Item Form */}
      {showAddItemForm && (
        <div className="add-item-form-container">
          <h3>Add Custom Item</h3>
          <form className="add-item-form" onSubmit={addItemToCart}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemName">Item Name</label>
                <input
                  type="text"
                  id="itemName"
                  name="Item Name"
                  value={newItem["Item Name"]}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="itemPrice">Price (£)</label>
                <input
                  type="number"
                  id="itemPrice"
                  name="Price (£)"
                  value={newItem["Price (£)"]}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemAllergy">Allergy Info</label>
                <input
                  type="text"
                  id="itemAllergy"
                  name="Allergy Info"
                  value={newItem["Allergy Info"]}
                  onChange={handleInputChange}
                  placeholder="e.g., Nuts, Dairy"
                />
              </div>
              <div className="form-group">
                <label htmlFor="itemSpice">Spice Level (1-5)</label>
                <input
                  type="number"
                  id="itemSpice"
                  name="Spice Level (1-5)"
                  value={newItem["Spice Level (1-5)"]}
                  onChange={handleInputChange}
                  min="1"
                  max="5"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemCalories">Calories</label>
                <input
                  type="number"
                  id="itemCalories"
                  name="Calories (per serving)"
                  value={newItem["Calories (per serving)"]}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="itemCategory">Category</label>
                <select
                  id="itemCategory"
                  name="Subcategory"
                  value={newItem.Subcategory}
                  onChange={handleInputChange}
                  className="category-select"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="itemDescription">Description</label>
                <textarea
                  id="itemDescription"
                  name="Description"
                  value={newItem.Description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit">Add to Cart</button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowAddItemForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="menu-page-container">
        {/* Categories Column */}
        <div className="categories-column">
          <h3>Categories</h3>
          {categories.map((category) => (
            <button
              key={category}
              className={`category-button ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Items Column */}
        <div className="items-column">
          <h3>{selectedCategory}</h3>
          <div className="items-grid">
            {currentItems.map((item) => (
              <div key={item.ID} className="menu-item">
                <div className="item-title-container">
                  <h4 className="item-name-text">{item["Item Name"]}</h4>
                  <AllergyIcon allergyInfo={item["Allergy Info"]} />
                </div>
                <p>£{item["Price (£)"]}</p>
                <p className="item-description">{item.Description}</p>
                <div className="item-button-container">
                  <button
                    className="item-button"
                    onClick={() => addMenuItemToCart(item)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && renderPaginationControls()}
        </div>

        {/* Empty Column for spacing */}
        <div className="empty-column"></div>

        {/* Cart Column */}
        <div className="cart-column">
          <h3>Your Cart</h3>
          <div className="cart">
            {cart.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-top">
                      <div className="item-name-container">
                        <span className="item-name">{item.name}</span>
                        <AllergyIcon allergyInfo={item.allergyInfo} size="14px" />
                      </div>
                    </div>
                    <div className="cart-item-bottom">
                      <span className="item-price">(£{item.price}) x {item.quantity}</span>
                      <div className="button-group">
                        <button
                          className="minus"
                          onClick={() => updateItemQuantity(item.id, "decrease")}
                        >
                          -
                        </button>
                        <button
                          className="plus"
                          onClick={() => updateItemQuantity(item.id, "increase")}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <p>
                  <strong>
                    Total: £
                    {cart
                      .reduce(
                        (total, item) => total + item.price * item.quantity,
                        0
                      )
                      .toFixed(2)}
                  </strong>
                </p>
                <button
                  className="print-label"
                  onClick={handlePrintLabel}
                >
                  Print Label
                </button>
                {userRole === "buyer" && (
                  <button
                    className="print-label"
                    onClick={handleSendToSupplier}
                  >
                    Send to Supplier
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
