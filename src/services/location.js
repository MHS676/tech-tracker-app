import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Use your computer's local IP for physical devices
// Change this to 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const SOCKET_URL = 'http://192.168.1.69:3000';
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

  // Get current location
  async getCurrentLocation() {
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

      console.log('Getting current location with high accuracy...');
      
      // Try to get last known location first (fast)
      try {
        const lastLocation = await Location.getLastKnownPositionAsync({
          maxAge: 60000, // Accept location up to 1 minute old
          requiredAccuracy: 100, // Within 100 meters
        });
        
        if (lastLocation) {
          console.log('📍 Using last known location:', lastLocation.coords.latitude, lastLocation.coords.longitude);
          return {
            lat: lastLocation.coords.latitude,
            lng: lastLocation.coords.longitude,
          };
        }
      } catch (lastLocationError) {
        console.log('Last known location not available, getting fresh location...');
      }
      
      // Try with low accuracy first (faster)
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeoutMs: 10000, // 10 seconds
        });
        
        console.log('📍 Location obtained (low accuracy):', location.coords.latitude, location.coords.longitude);
        
        return {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
      } catch (lowAccuracyError) {
        console.log('Low accuracy failed, trying balanced...');
        
        // Fallback to balanced
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeoutMs: 15000,
        });
        
        console.log('📍 Location obtained (balanced accuracy):', location.coords.latitude, location.coords.longitude);
        
        return {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
      }
    } catch (error) {
      console.error('getCurrentLocation error:', error);
      
      // Provide specific error messages
      if (error.message.includes('Location services')) {
        throw error; // Re-throw our custom message
      } else if (error.message.includes('timeout')) {
        throw new Error('Location request timed out. Please make sure you are outdoors or near a window.');
      } else if (error.message.includes('unavailable')) {
        throw new Error('Location unavailable. Please:\n1. Enable Location in Settings\n2. Select "High Accuracy" mode\n3. Go near a window or outdoors\n4. Restart your device if issue persists');
      } else {
        throw new Error('Unable to get location. Please check:\n1. Location/GPS is enabled\n2. High Accuracy mode is selected\n3. You are outdoors or near a window');
      }
    }
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
  async toggleGPS(enabled) {
    try {
      if (!this.socket?.connected || !this.techId) {
        throw new Error('Not connected to server. Please check your internet connection.');
      }

      let location = null;
      if (enabled) {
        // Request permissions first
        console.log('Requesting location permissions...');
        await this.requestPermissions();
        
        // Wait a moment for GPS to warm up
        console.log('Warming up GPS...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get current location with retries
        console.log('Getting current location...');
        let retries = 2; // Reduced from 3 to 2 for faster response
        let lastError = null;
        
        for (let i = 0; i < retries; i++) {
          try {
            location = await this.getCurrentLocation();
            console.log('✅ Location obtained:', location);
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error;
            console.log(`Attempt ${i + 1}/${retries} failed:`, error.message);
            if (i < retries - 1) {
              console.log('Retrying in 1 second...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!location) {
          throw lastError || new Error('Failed to get location after multiple attempts');
        }
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
