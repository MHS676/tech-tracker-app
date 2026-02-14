import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// For Android Emulator use 10.0.2.2, for iOS use localhost, for device use your IP
const SOCKET_URL = 'http://10.0.2.2:3000';
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
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted');
    }

    return { foreground: foregroundStatus, background: backgroundStatus };
  }

  // Get current location
  async getCurrentLocation() {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
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
    if (!this.socket?.connected || !this.techId) {
      throw new Error('Not connected to server');
    }

    let location = null;
    if (enabled) {
      await this.requestPermissions();
      location = await this.getCurrentLocation();
    }

    // Emit toggle event to server
    this.socket.emit('toggleGPS', {
      techId: this.techId,
      enabled,
      lat: location?.lat,
      lng: location?.lng,
    });

    if (enabled && location) {
      // Start continuous tracking without job
      this.isTracking = true;
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 20, // Or every 20 meters
        },
        (loc) => {
          this.sendLocation(loc.coords.latitude, loc.coords.longitude);
        }
      );
    } else {
      // Stop tracking
      await this.stopTracking();
    }

    return { enabled, location };
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
