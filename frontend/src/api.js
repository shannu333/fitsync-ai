import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ricepulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept 401 Unauthorized responses to clear token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('ricepulse_token');
      localStorage.removeItem('ricepulse_user');
      // Dispatch custom event so React components can update immediately
      window.dispatchEvent(new Event('auth-changed'));
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data.access_token) {
      localStorage.setItem('ricepulse_token', res.data.access_token);
      localStorage.setItem('ricepulse_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('auth-changed'));
    }
    return res.data;
  },

  register: async (farmerData) => {
    const res = await api.post('/auth/register', farmerData);
    if (res.data.access_token) {
      localStorage.setItem('ricepulse_token', res.data.access_token);
      localStorage.setItem('ricepulse_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('auth-changed'));
    }
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get('/auth/me');
    localStorage.setItem('ricepulse_user', JSON.stringify(res.data));
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('ricepulse_token');
    localStorage.removeItem('ricepulse_user');
    window.dispatchEvent(new Event('auth-changed'));
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('ricepulse_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('ricepulse_token');
  }
};

export const geoAPI = {
  getDistricts: async () => {
    const res = await api.get('/geo/districts');
    return res.data;
  },

  getMandals: async (district) => {
    const res = await api.get(`/geo/mandals?district=${encodeURIComponent(district)}`);
    return res.data;
  },

  getVillages: async (district, mandal) => {
    const res = await api.get(`/geo/villages?district=${encodeURIComponent(district)}&mandal=${encodeURIComponent(mandal)}`);
    return res.data;
  },

  getMetadata: async () => {
    const res = await api.get('/geo/metadata');
    return res.data;
  }
};

export const userAPI = {
  updateProfile: async (data) => {
    const res = await api.put('/user/profile', data);
    localStorage.setItem('ricepulse_user', JSON.stringify(res.data));
    return res.data;
  },

  updateFarm: async (farmId, data) => {
    const res = await api.put(`/user/farm/${farmId}`, data);
    return res.data;
  },

  updateConsent: async (consentGiven) => {
    const res = await api.post(`/user/consent?consent_given=${consentGiven}`);
    return res.data;
  }
};

export const farmAPI = {
  getAll: async () => {
    const res = await api.get('/farms/');
    return res.data;
  },

  getById: async (farmId) => {
    const res = await api.get(`/farms/${farmId}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/farms/', data);
    return res.data;
  },

  update: async (farmId, data) => {
    const res = await api.put(`/farms/${farmId}`, data);
    return res.data;
  },

  delete: async (farmId) => {
    const res = await api.delete(`/farms/${farmId}`);
    return res.data;
  },

  getAnalytics: async (farmId) => {
    const res = await api.get(`/farms/${farmId}/analytics`);
    return res.data;
  }
};

export const weatherAPI = {
  /**
   * Fetch real daily weather history + short forecast for a specific farm.
   * @param {number} farmId
   * @param {number} pastDays  - number of past days (default 30)
   * @param {number} forecastDays - forecast days ahead (default 3)
   */
  getFarmWeather: async (farmId, pastDays = 30, forecastDays = 3) => {
    const res = await api.get(
      `/weather/farm/${farmId}?past_days=${pastDays}&forecast_days=${forecastDays}`
    );
    return res.data;
  },

  /**
   * Fetch weather for arbitrary coordinates (useful for testing / map preview).
   */
  getCoordinateWeather: async (lat, lng, pastDays = 30, forecastDays = 3) => {
    const res = await api.get(
      `/weather/coordinates?lat=${lat}&lng=${lng}&past_days=${pastDays}&forecast_days=${forecastDays}`
    );
    return res.data;
  },
};

export const satelliteAPI = {
  /**
   * Fetch Sentinel-2 L2A satellite time series from Copernicus CDSE for a specific farm.
   * @param {number} farmId
   * @param {number} pastDays - historical search window (default 90)
   * @param {number} cloudThreshold - cloud mask threshold % (default 25)
   */
  getFarmSatellite: async (farmId, pastDays = 90, cloudThreshold = 25) => {
    const res = await api.get(
      `/satellite/farm/${farmId}?past_days=${pastDays}&cloud_threshold=${cloudThreshold}`
    );
    return res.data;
  },

  /**
   * Fetch Sentinel-2 satellite data for direct coordinates.
   */
  getCoordinateSatellite: async (lat, lng, pastDays = 90, cloudThreshold = 25) => {
    const res = await api.get(
      `/satellite/coordinates?lat=${lat}&lng=${lng}&past_days=${pastDays}&cloud_threshold=${cloudThreshold}`
    );
    return res.data;
  },
};

export const stressAPI = {
  getFarmStress: async (farmId) => {
    const res = await api.get(`/stress/farm/${farmId}`);
    return res.data;
  },
  simulateStress: async (scenario, lat, lng) => {
    const res = await api.post('/stress/simulate', { scenario, lat, lng });
    return res.data;
  },
};

export const yieldAPI = {
  /**
   * Fetch ML yield prediction and recommendations for a farm plot.
   * @param {number} farmId
   * @param {string} [season] - 'Kharif' or 'Rabi'
   */
  getFarmYield: async (farmId, season = null) => {
    const url = season ? `/yield/farm/${farmId}?season=${season}` : `/yield/farm/${farmId}`;
    const res = await api.get(url);
    return res.data;
  },

  /**
   * Fetch actual Scikit-learn model validation metrics.
   */
  getModelMetrics: async () => {
    const res = await api.get('/yield/model-metrics');
    return res.data;
  },

  /**
   * Interactive custom scenario prediction.
   */
  predictCustom: async (payload) => {
    const res = await api.post('/yield/predict-custom', payload);
    return res.data;
  },
};

export const smsAPI = {
  getHistory: async (limit = 50) => {
    const res = await api.get(`/sms/history?limit=${limit}`);
    return res.data;
  },
  sendTest: async (farmId, category = 'Water Stress / Agricultural Drought') => {
    const res = await api.post(`/sms/send-test?${farmId ? `farm_id=${farmId}&` : ''}category=${encodeURIComponent(category)}`);
    return res.data;
  },
  triggerCycle: async () => {
    const res = await api.post('/sms/trigger-cycle');
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/sms/status');
    return res.data;
  },
};

export const adminAPI = {
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getUsers: async (limit = 50, offset = 0) => {
    const res = await api.get(`/admin/users?limit=${limit}&offset=${offset}`);
    return res.data;
  },
  getApiHealth: async () => {
    const res = await api.get('/admin/api-health');
    return res.data;
  },
  getSchedulerStatus: async () => {
    const res = await api.get('/admin/scheduler-status');
    return res.data;
  },
  triggerCycle: async () => {
    const res = await api.post('/admin/trigger-cycle');
    return res.data;
  },
  getFailedSms: async (limit = 50, statusFilter = null) => {
    const url = statusFilter
      ? `/admin/failed-sms?limit=${limit}&status_filter=${statusFilter}`
      : `/admin/failed-sms?limit=${limit}`;
    const res = await api.get(url);
    return res.data;
  },
};

export default api;
