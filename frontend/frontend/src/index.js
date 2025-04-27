// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './Context/UserContext'; // ✅ fixed
import { OrderProvider } from './Context/OrderContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <UserProvider>
    <OrderProvider>
      <App />
    </OrderProvider>
  </UserProvider>
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();