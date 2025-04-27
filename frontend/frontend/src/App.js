import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MenuPage from "./components/MenuPage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import BuyerProfile from "./components/BuyerProfile";
import SupplierProfile from "./components/SupplierProfile";
import Navbar from "./components/Navbar";
import LandingPage from "./components/LandingPage"; // Import the LandingPage component
import SupplierNotifications from "./components/SupplierNotifications";
import BuyerNotification from "./components/BuyerNotification";
import { useUser } from "./Context/UserContext";
import NotificationsPage from "./pages/NotificationsPage";
import "./styles.css";

function App() {
  const { isLoggedIn, userRole } = useUser();
  console.log("isLoggedIn", isLoggedIn);
  return (
    <BrowserRouter>
      <div className="App">
        {/* Conditionally Render Navbar if Logged In */}
        {isLoggedIn && <Navbar />}
        
        <ToastContainer />

        <Routes>
          {/* Default Route (Landing Page) */}
          <Route path="/" element={<LandingPage />} />

          {/* Route for the Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Route for the Registration Page */}
          <Route path="/register" element={<RegisterPage />} />

          {/* Route for the Menu Page */}
          <Route
            path="/menu"
            element={isLoggedIn ? <MenuPage /> : <Navigate to="/login" />}
          />

          {/* Route for Buyer Profile */}
          <Route
            path="/buyer-profile"
            element={
              isLoggedIn && userRole === "buyer" ? (
                <BuyerProfile />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Route for Supplier Profile */}
          <Route
            path="/supplier-profile"
            element={
              isLoggedIn && userRole === "supplier" ? (
                <SupplierProfile />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/supplier-notification"
            element={<SupplierNotifications />}
          />
          <Route path="/Buyer-notification" element={<BuyerNotification />} />

          {/* Route for Notifications Page */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Redirect to Landing Page if no path matches */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
