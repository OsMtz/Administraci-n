import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Revisar si hay un usuario guardado al cargar la app
  useEffect(() => {
    const savedUser = localStorage.getItem("user_session");
    if (savedUser) {
      // Convertimos el texto de localStorage de vuelta a un objeto JS
      setUser(JSON.parse(savedUser)); 
    }
    setLoading(false);
  }, []);

  // 2. Función para iniciar sesión mejorada
  // Ahora recibe 'userData' que es un objeto: { nombre, rol, token }
  const login = (userData) => {
    setUser(userData);
    // Guardamos todo el objeto como texto en localStorage
    localStorage.setItem("user_session", JSON.stringify(userData));
  };

  // 3. Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem("user_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);