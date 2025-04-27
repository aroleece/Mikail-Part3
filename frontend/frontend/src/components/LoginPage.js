import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../Context/UserContext';
import { showErrorToast } from '../utils/toast';

const LoginPage = () => {

  const {
    setIsLoggedIn,
   setUsername,
     setUserRole,
    setUserEmail
    , setUserPassword
  } = useUser();

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
   
  });

  const handleLogin = async () => {
   
    try {
      const response = await axios.post('http://localhost:8000/api/login/', formData);
      if (response.status === 200) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        setIsLoggedIn(true);
        const user = response.data.user;
        console.log(user.id)
        setUsername(user.username);
        setUserEmail(user.email); 
        setUserRole(user.role)
        setUserPassword(formData.password)
        navigate('/menu');
      }
    } catch (error) {
      console.log(error);
      showErrorToast("Login failed: Invalid username or password");
    }
    
   
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2 className="form-title">Login</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="input-group">
          <label>Username or Email:</label>
            <input
              type="text"
              placeholder="Enter your username/email"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>
          <div className="input-group">
            <label>Password:</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <button className="submit-btn" onClick={handleLogin}>Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
