import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Use your computer's local IP for physical devices
// Change this to 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.0.35:3000';
const LOCATION_TASK_NAME = 'background-location-task';

class LocationService {
  constructor() {
    this.socket = null;
    this.techId = null;
    this.currentJobId = null;
    this.isTracking = false;
    this.locationSubscription = null;
  }

  // Connect to socket server
  connect(techId) {
    try {
      if (this.socket?.connected) {
        console.log('Socket already connected');
        return;
      }

      console.log('Connecting to socket:', SOCKET_URL);
      this.techId = techId;
      
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
        this.socket.emit('joinTech', techId);
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      this.socket.on('locationSaved', (data) => {
        console.log('📍 Location saved:', data);
      });

      this.socket.on('trackingError', (error) => {
        console.error('Tracking error:', error);
      });

      this.socket.on('routeStarted', (data) => {
        console.log('🚀 Route started:', data);
      });

      this.socket.on('routeCompleted', (data) => {
        console.log('✅ Route completed:', data);
      });

      return this.socket;
    } catch (error) {
      console.error('Socket connection failed:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopTracking();
  }

  // Request location permissions
  async requestPermissions() {
    try {
      // Check if location services are enabled first
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        throw new Error('Location services are disabled. Please enable location in your device settings.');
      }

      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Location permission denied. Please grant location access in app settings.');
      }

      // Background permission is optional
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted - tracking will only work when app is open');
        }
        return { foreground: foregroundStatus, background: backgroundStatus };
      } catch (bgError) {
        console.warn('Background permission request failed:', bgError);
        return { foreground: foregroundStatus, background: 'denied' };
      }
    } catch (error) {
      console.error('Permission request error:', error);
      throw error;
    }
  }

  // Get current location with progress tracking
  async getCurrentLocation(progressCallback = null) {
    try {
      // Check permissions first
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error('Location services are disabled. Please enable GPS/Location in your device settings.');
      }

      console.log('Attempting to get location...');
      if (progressCallback) progressCallback('Getting your location...');
      
      // Strategy 1: Try last known location first (fastest)
      try {
        const lastLocation = await Location.getLastKnownPositionAsync({
          maxAge: 600000, // Accept up to 10 minutes old
        });
        
        if (lastLocation) {
          console.log('✅ Using last known location:', lastLocation.coords.latitude, lastLocation.coords.longitude, 'accuracy:', lastLocation.coords.accuracy);
          if (progressCallback) progressCallback('Location found!');
          return {
            lat: lastLocation.coords.latitude,
            lng: lastLocation.coords.longitude,
          };
        }
      } catch (error) {
        console.log('No last known location');
      }
      
      // Strategy 2: Try Balanced accuracy (good for indoor)
      if (progressCallback) progressCallback('Requesting GPS location...');
      try {
        console.log('Trying Balanced accuracy...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
        console.log('✅ Got Balanced location:', location.coords.latitude, location.coords.longitude, 'accuracy:', location.coords.accuracy);
        if (progressCallback) progressCallback('Location acquired!');
        return {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
      } catch (error) {
        console.log('Balanced accuracy failed:', error.message);
      }
      
      // Strategy 3: Try Low accuracy (even more permissive)
      if (progressCallback) progressCallback('Trying alternative method...');
      try {
        console.log('Trying Low accuracy...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeout: 10000,
        });
        console.log('✅ Got Low accuracy location:', location.coords.latitude, location.coords.longitude, 'accuracy:', location.coords.accuracy);
        if (progressCallback) progressCallback('Location acquired!');
        return {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
      } catch (error) {
        console.log('Low accuracy failed:', error.message);
      }
      
      // Strategy 4: Last resort - Lowest accuracy
      if (progressCallback) progressCallback('Final attempt...');
      try {
        console.log('Trying Lowest accuracy (last resort)...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
          timeout: 10000,
        });
        console.log('✅ Got Lowest accuracy location:', location.coords.latitude, location.coords.longitude);
        if (progressCallback) progressCallback('Location acquired!');
        return {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
      } catch (error) {
        console.log('All location attempts failed:', error.message);
        throw new Error('Cannot get GPS signal. Please:\n1. Go to Settings > Location\n2. Enable "Use GPS, Wi-Fi, and mobile networks"\n3. Restart your device\n4. Try outdoors with clear sky view');
      }
      
    } catch (error) {
      console.error('getCurrentLocation error:', error);
      throw error; // Throw original error without modification
    }
  }

  // Helper method to get fresh high accuracy location
  async _getFreshHighAccuracyLocation(progressCallback = null) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let fallbackTimeoutId;
      let subscription;
      let gotLocation = false;
      let lastLocation = null;

      // Accept any location after 15 seconds if we haven't got a good one
      fallbackTimeoutId = setTimeout(() => {
        if (!gotLocation && lastLocation) {
          gotLocation = true;
          clearTimeout(timeoutId);
          if (subscription) {
            subscription.remove();
          }
          console.log('⚠️ Using best available location (accuracy:', lastLocation.coords.accuracy, 'm)');
          resolve({
            lat: lastLocation.coords.latitude,
            lng: lastLocation.coords.longitude,
          });
        }
      }, 15000); // Accept whatever we have after 15 seconds

      // Hard timeout after 30 seconds
      timeoutId = setTimeout(() => {
        if (subscription) {
          subscription.remove();
        }
        if (!gotLocation) {
          clearTimeout(fallbackTimeoutId);
          reject(new Error('GPS timeout - no signal received. Please ensure location services are enabled.'));
        }
      }, 30000);

      // Use Balanced accuracy for better indoor performance
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Changed from High to Balanced for better indoor performance
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (location) => {
          lastLocation = location; // Always store the latest location
          
          // Accept when accuracy is 100m or better (more realistic for indoor use)
          if (!gotLocation && location.coords.accuracy <= 100) {
            gotLocation = true;
            clearTimeout(timeoutId);
            clearTimeout(fallbackTimeoutId);
            if (subscription) {
              subscription.remove();
            }
            console.log('📍 Good location obtained:', location.coords.latitude, location.coords.longitude, 'accuracy:', location.coords.accuracy, 'm');
            resolve({
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            });
          } else if (!gotLocation) {
            console.log('Improving location... accuracy:', location.coords.accuracy, 'm');
            if (progressCallback) {
              progressCallback(`GPS accuracy: ${Math.round(location.coords.accuracy)}m (waiting for better signal)`);
            }
          }
        }
      ).then((sub) => {
        subscription = sub;
      }).catch((error) => {
        clearTimeout(timeoutId);
        clearTimeout(fallbackTimeoutId);
        reject(error);
      });
    });
  }

  // Start route for a job (marks start point)
  async startRoute(jobId) {
    if (!this.socket?.connected || !this.techId) {
      throw new Error('Not connected to server');
    }

    const location = await this.getCurrentLocation();
    
    this.currentJobId = jobId;
    
    // Emit start route event
    this.socket.emit('startRoute', {
      techId: this.techId,
      jobId,
      lat: location.lat,
      lng: location.lng,
    });

    // Start continuous tracking
    await this.startTracking(jobId);

    return location;
  }

  // End route for a job (marks end point)
  async endRoute(jobId) {
    if (!this.socket?.connected || !this.techId) {
      throw new Error('Not connected to server');
    }

    const location = await this.getCurrentLocation();
    
    // Emit end route event
    this.socket.emit('endRoute', {
      techId: this.techId,
      jobId: jobId || this.currentJobId,
      lat: location.lat,
      lng: location.lng,
    });

    // Stop tracking
    await this.stopTracking();
    this.currentJobId = null;

    return location;
  }

  // Start continuous location tracking
  async startTracking(jobId) {
    if (this.isTracking) return;

    await this.requestPermissions();

    this.isTracking = true;
    this.currentJobId = jobId;

    // Use foreground location tracking
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      (location) => {
        this.sendLocation(location.coords.latitude, location.coords.longitude);
      }
    );

    console.log('Location tracking started');
  }

  // Stop location tracking
  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  // Send location update to server
  sendLocation(lat, lng) {
    if (this.socket?.connected && this.techId) {
      this.socket.emit('updateLocation', {
        techId: this.techId,
        lat,
        lng,
        jobId: this.currentJobId,
      });
    }
  }

  // Manual location update
  async updateLocationManually() {
    const location = await this.getCurrentLocation();
    this.sendLocation(location.lat, location.lng);
    return location;
  }

  // Toggle GPS on/off without job context
  async toggleGPS(enabled, progressCallback = null) {
    try {
      if (!this.socket?.connected || !this.techId) {
        throw new Error('Not connected to server. Please check your internet connection.');
      }

      let location = null;
      if (enabled) {
        // Check if location services are enabled FIRST
        console.log('Checking location services...');
        if (progressCallback) progressCallback('Checking location settings...');
        
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          throw new Error('Location services are OFF. Please enable Location in your device Settings.');
        }
        
        console.log('✅ Location services are enabled');
        
        // Request permissions
        console.log('Requesting location permissions...');
        if (progressCallback) progressCallback('Requesting permissions...');
        await this.requestPermissions();
        
        console.log('✅ Permissions granted');
        if (progressCallback) progressCallback('Getting your location...');
        console.log('GPS initialized, getting location...');
        
        // Get current location (this will use last known + fresh high accuracy)
        location = await this.getCurrentLocation(progressCallback);
        console.log('✅ Location obtained:', location);
      }

      // Emit toggle event to server
      console.log('Emitting toggleGPS to server:', { enabled, location });
      this.socket.emit('toggleGPS', {
        techId: this.techId,
        enabled,
        lat: location?.lat,
        lng: location?.lng,
      });

      if (enabled && location) {
        // Start continuous tracking without job
        console.log('Starting continuous location tracking...');
        this.isTracking = true;
        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 20, // Or every 20 meters
          },
          (loc) => {
            console.log('📍 Location update:', loc.coords.latitude, loc.coords.longitude);
            this.sendLocation(loc.coords.latitude, loc.coords.longitude);
          }
        );
        console.log('✅ Location tracking started');
      } else {
        // Stop tracking
        console.log('Stopping location tracking...');
        await this.stopTracking();
      }

      return { enabled, location };
    } catch (error) {
      console.error('toggleGPS error:', error);
      throw error;
    }
  }

  // Check if tracking is active
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      isConnected: this.socket?.connected || false,
      currentJobId: this.currentJobId,
    };
  }
}

export const locationService = new LocationService();
export default locationService;
