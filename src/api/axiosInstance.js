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
    let token = config.sessionToken;

    // 2. If no explicit sessionToken provided, try to resolve token from localStorage using session in URL
    if (!token && config.url) {
      const cleanUrl = config.url.replace(/^\/+/, '');
      const parts = cleanUrl.split('/');
      const sessionCandidate = parts[0];
      const secretKey = import.meta.env.VITE_WPP_SECRET;

      if (sessionCandidate && sessionCandidate !== secretKey) {
        const storedToken = localStorage.getItem(`wpp_token_${sessionCandidate}`);
        if (storedToken) {
          token = storedToken;
        }
      }
    }

    // 3. Fallback to global secret key for administrative endpoints (e.g. show-all-sessions)
    if (!token) {
      token = import.meta.env.VITE_WPP_SECRET;
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers['secretkey'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const cleanUrl = (originalRequest?.url || '').replace(/^\/+/, '');
    const parts = cleanUrl.split('/');
    const sessionCandidate = parts[0];
    const secretKey = import.meta.env.VITE_WPP_SECRET;

    console.log(`[Axios Interceptor] Status: ${status}, URL: ${originalRequest?.url}, Session: ${sessionCandidate}`);

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (sessionCandidate && sessionCandidate !== secretKey) {
        try {
          console.log(`[Axios Interceptor] Generating fresh token for session: ${sessionCandidate}`);
          localStorage.removeItem(`wpp_token_${sessionCandidate}`);

          const { data } = await axios.post(`/api/${sessionCandidate}/${secretKey}/generate-token`);
          const newToken = data.token || data.response?.token;
          console.log(`[Axios Interceptor] New token received: ${newToken ? 'YES' : 'NO'}`, data);

          if (newToken) {
            localStorage.setItem(`wpp_token_${sessionCandidate}`, newToken);
            // Build new headers properly
            const newHeaders = { 
              ...originalRequest.headers,
              'Authorization': `Bearer ${newToken}`,
              'secretkey': newToken
            };
            return axiosInstance({ 
              ...originalRequest, 
              headers: newHeaders,
              sessionToken: newToken
            });
          }
        } catch (genErr) {
          console.error(`[Axios Interceptor] Failed to auto-refresh token for session ${sessionCandidate}:`, genErr?.response?.data || genErr.message);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;