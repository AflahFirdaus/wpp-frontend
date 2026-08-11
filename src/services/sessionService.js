import axiosInstance from '../api/axiosInstance';

const SECRET_KEY = import.meta.env.VITE_WPP_SECRET;

export const SessionService = {
  async ensureSessionToken(sessionName) {
    if (!sessionName) return null;
    let token = localStorage.getItem(`wpp_token_${sessionName}`);
    if (!token) {
      try {
        const auth = await this.generateToken(sessionName);
        token = auth?.token || auth?.response?.token;
      } catch (err) {
        console.error(`Failed to generate token for session ${sessionName}:`, err);
      }
    }
    return token;
  },

  async getAllSessions() {
    const { data } = await axiosInstance.get(`/${SECRET_KEY}/show-all-sessions`);
    const sessionNames = data.response || data;

    // Backend returns array of strings like ["project", "test_session"]
    // We need to enrich them with status info
    if (Array.isArray(sessionNames)) {
      const enriched = await Promise.all(
        sessionNames.map(async (name) => {
          const sessionName = typeof name === 'string' ? name : name.session || name;
          try {
            const token = await this.ensureSessionToken(sessionName);
            const { data: statusData } = await axiosInstance.get(`/${sessionName}/status-session`, {
              sessionToken: token
            });
            return {
              session: sessionName,
              status: statusData.status || statusData.response?.status || 'CLOSED',
              connected: statusData.status === 'CONNECTED' || statusData.response?.status === 'CONNECTED'
            };
          } catch {
            return { session: sessionName, status: 'CLOSED', connected: false };
          }
        })
      );
      return enriched;
    }
    return [];
  },

  async generateToken(sessionName) {
    const { data } = await axiosInstance.post(`/${sessionName}/${SECRET_KEY}/generate-token`);
    const token = data.token || data.response?.token;
    if (token) {
      localStorage.setItem(`wpp_token_${sessionName}`, token);
    }
    return data;
  },

  async startSession(sessionName) {
    const token = await this.ensureSessionToken(sessionName);

    const { data } = await axiosInstance.post(`/${sessionName}/start-session`, {
      waitQrCode: true
    }, {
      sessionToken: token
    });
    return data.response || data;
  },

  async getSessionStatus(sessionName) {
    const token = await this.ensureSessionToken(sessionName);
    const { data } = await axiosInstance.get(`/${sessionName}/status-session`, {
      sessionToken: token
    });
    return data.response || data;
  },

  getSessionToken(sessionName) {
    return localStorage.getItem(`wpp_token_${sessionName}`);
  },

  async deleteSession(sessionName) {
    const { data } = await axiosInstance.post(`/${sessionName}/${SECRET_KEY}/clear-session-data`);
    if (data.success || data.status) {
      localStorage.removeItem(`wpp_token_${sessionName}`);
    }
    return data;
  }
};