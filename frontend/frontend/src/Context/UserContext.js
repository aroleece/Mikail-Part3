import React, { createContext, useContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPassword, setUserPassword] = useState(""); // if needed
  const [buyer_id, setbuyer_id] = useState("");
  const [order_id, setOrder_id] = useState("");

  return (
    <UserContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        username,
        setUsername,
        userEmail,
        setUserEmail,
        userRole,
        setUserRole,
        userPassword,
        setUserPassword,
        buyer_id,
        setbuyer_id,
        order_id,
        setOrder_id,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
