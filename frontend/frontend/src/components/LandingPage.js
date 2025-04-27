import React from "react";

const LandingPage = () => {
  return (
    <div>
      {/* landing-page-PC */}
      <div className="landing-page-PC">
        {/* Authentication Section */}
        <div className="auth-section">
          <h1>Welcome to Your Very Own Platform 'Mikail'</h1>
          <p>Please log in or register to continue.</p>

          {/* Buttons for Login and Register */}
          <div className="auth-buttons">
            <a href="/login" className="button login-button">
              Login
            </a>
            <a href="/register" className="button register-button">
              Register
            </a>
          </div>
        </div>

        {/* Image Gallery Section */}
        <div className="image-gallery">
          {/* First Row of Images */}
          <img src="/images/Gallery1.png" alt="Gallery 1" />
          <img src="/images/Gallery2.png" alt="Gallery 2" />

          {/* Second Row of Images */}
          <img src="/images/Gallery4.png" alt="Gallery 4" />
          <img src="/images/Gallery4.png" alt="Gallery 4" />

          {/* Third Row of Images */}
          <img src="/images/Gallery5.png" alt="Gallery 5" />
          <img src="/images/Gallery6.png" alt="Gallery 6" />
        </div>
      </div>

      {/* landing-page-PC */}
      <div className="landing-page-mobile">
        {/* Top Image Row */}
        <div className="image-row">
          <img src={"/images/Gallery1.png"} alt="Gallery 1" />
          <img src="/images/Gallery2.png" alt="Gallery 2" />
          {/* <img src="/images/Gallery4.png" alt="Gallery 4" /> */}
        </div>

        {/* Center Text and Buttons */}
        <div className="center-section">
          <h1>Welcome to Your Very Own Platform 'Mikail'</h1>
          <p>Please log in or register to continue.</p>
          <div className="auth-buttons">
            <a href="/login" className="button login-button">
              Login
            </a>
            <a href="/register" className="button register-button">
              Register
            </a>
          </div>
        </div>

        {/* Bottom Image Row */}
        <div className="image-row">
          <img src="/images/Gallery4.png" alt="Gallery 4" />
          <img src="/images/Gallery5.png" alt="Gallery 5" />
          <img src="/images/Gallery6.png" alt="Gallery 6" />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
