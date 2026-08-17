import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

function getStoredAuth() {
  const token = localStorage.getItem("authToken");
  const storedUser = localStorage.getItem("userData");

  let user = null;

  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse stored user data:", error);
      localStorage.removeItem("userData");
    }
  }

  return {
    token,
    user,
    isLoggedIn: Boolean(token),
  };
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getStoredAuth);

  const login = ({ token, user }) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userData", JSON.stringify(user));
    localStorage.setItem("isLoggedIn", "true");

    setAuthState({
      token,
      user,
      isLoggedIn: true,
    });
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");

    setAuthState({
      token: null,
      user: null,
      isLoggedIn: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: authState.isLoggedIn,
        token: authState.token,
        user: authState.user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
