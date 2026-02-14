// Use your computer's local IP for physical devices
// Change this to 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.35:3000/api';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Auth
  async login(email, password) {
    try {
      console.log('Login attempt:', { email, url: `${API_BASE_URL}/technician/login` });
      
      const response = await fetch(`${API_BASE_URL}/technician/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      console.log('Login response:', { success: data.success, hasToken: !!data.token });
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      if (!data.success || !data.token) {
        throw new Error('Invalid server response');
      }
      
      this.setToken(data.token);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Network request failed');
    }
  }

  async register(name, email, password) {
    try {
      console.log('Register attempt:', { name, email, url: `${API_BASE_URL}/technician/register` });
      
      const response = await fetch(`${API_BASE_URL}/technician/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      console.log('Register response:', { success: data.success, hasToken: !!data.token });
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      if (!data.success || !data.token) {
        throw new Error('Invalid server response');
      }
      
      this.setToken(data.token);
      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw new Error(error.message || 'Network request failed');
    }
  }

  logout() {
    this.clearToken();
  }

  // Jobs
  async getMyJobs(techId) {
    const response = await fetch(`${API_BASE_URL}/technician/${techId}/jobs`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch jobs');
    return data.jobs;
  }

  async acceptJob(jobId) {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/accept`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to accept job');
    return data.job;
  }

  async startJob(jobId, techId) {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/start`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ techId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to start job');
    return data.job;
  }

  async completeJob(jobId, techId) {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/complete`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ techId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to complete job');
    return data.job;
  }

  // Profile
  async getProfile(techId) {
    const response = await fetch(`${API_BASE_URL}/technician/${techId}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
    return data.technician;
  }

  async toggleTracking(techId, isTracking) {
    const response = await fetch(`${API_BASE_URL}/technician/${techId}/toggle-tracking`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ isTracking }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to toggle tracking');
    return data.technician;
  }

  async getLocationHistory(techId) {
    const response = await fetch(`${API_BASE_URL}/technician/${techId}/location-history`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch location history');
    return data.locationHistory;
  }
}

export const api = new ApiService();
export default api;
