import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api', // Ini akan diproxy oleh Vite ke http://localhost:21465/api
  headers: {
    'Content-Type': 'application/json',
  }
});

axiosInstance.interceptors.request.use(
  (config) => {
    // 1. Check if we have a specific token for this session in the config (passed manually)
    // 2. Or fallback to the global secret key (for administrative endpoints)
    const token = config.sessionToken || import.meta.env.VITE_WPP_SECRET; 
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers['secretkey'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;