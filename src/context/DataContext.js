import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import locationService from '../services/location';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isGPSOn, setIsGPSOn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);

  const fetchJobs = useCallback(async (techId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMyJobs(techId);
      setJobs(data);
      
      // Check if there's an active job
      const inProgressJob = data.find(j => j.status === 'IN_PROGRESS');
      if (inProgressJob) {
        setActiveJobId(inProgressJob.id);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptJob = async (jobId) => {
    const updatedJob = await api.acceptJob(jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
    return updatedJob;
  };

  const startJob = async (jobId, techId) => {
    try {
      // Start location tracking and mark start point
      const startLocation = await locationService.startRoute(jobId);
      setCurrentLocation(startLocation);
      setIsTracking(true);
      setActiveJobId(jobId);
      
      // Call API to update job status
      const updatedJob = await api.startJob(jobId, techId);
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
      return updatedJob;
    } catch (err) {
      console.error('Error starting job:', err);
      throw err;
    }
  };

  const completeJob = async (jobId, techId) => {
    try {
      // End location tracking and mark end point
      const endLocation = await locationService.endRoute(jobId);
      setCurrentLocation(endLocation);
      setIsTracking(false);
      setActiveJobId(null);
      
      // Call API to update job status
      const updatedJob = await api.completeJob(jobId, techId);
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
      return updatedJob;
    } catch (err) {
      console.error('Error completing job:', err);
      throw err;
    }
  };

  const toggleTracking = async (enabled, techId) => {
    try {
      if (enabled) {
        await locationService.startTracking(activeJobId);
        setIsTracking(true);
      } else {
        await locationService.stopTracking();
        setIsTracking(false);
      }
      
      // Also update on server
      await api.toggleTracking(techId, enabled);
    } catch (err) {
      console.error('Error toggling tracking:', err);
      throw err;
    }
  };

  const updateLocation = async () => {
    try {
      const location = await locationService.updateLocationManually();
      setCurrentLocation(location);
      return location;
    } catch (err) {
      console.error('Error updating location:', err);
      throw err;
    }
  };

  // Toggle GPS on/off without job context
  const toggleGPS = async (enabled) => {
    try {
      const result = await locationService.toggleGPS(enabled);
      setIsGPSOn(enabled);
      setIsTracking(enabled);
      if (result.location) {
        setCurrentLocation(result.location);
      }
      return result;
    } catch (err) {
      console.error('Error toggling GPS:', err);
      throw err;
    }
  };

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'ASSIGNED').length,
    active: jobs.filter(j => ['ACCEPTED', 'IN_PROGRESS'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
  };

  return (
    <DataContext.Provider value={{
      jobs,
      loading,
      error,
      stats,
      isTracking,
      isGPSOn,
      currentLocation,
      activeJobId,
      fetchJobs,
      acceptJob,
      startJob,
      completeJob,
      toggleTracking,
      toggleGPS,
      updateLocation,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
