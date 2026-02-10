import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import locationService from '../services/location';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user');
      
      if (token && userData) {
        api.setToken(token);
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Connect to socket for location tracking
        locationService.connect(parsedUser.id);
      }
    } catch (error) {
      console.log('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    await SecureStore.setItemAsync('auth_token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.technician));
    setUser(data.technician);
    setIsAuthenticated(true);
    
    // Connect to socket for location tracking
    locationService.connect(data.technician.id);
    
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.register(name, email, password);
    await SecureStore.setItemAsync('auth_token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.technician));
    setUser(data.technician);
    setIsAuthenticated(true);
    
    // Connect to socket for location tracking
    locationService.connect(data.technician.id);
    
    return data;
  };

  const logout = async () => {
    // Disconnect location service
    locationService.disconnect();
    
    api.logout();
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading, 
      login, 
      register, 
      logout,
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
