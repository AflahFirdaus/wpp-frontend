import axiosInstance from '../api/axiosInstance';
import { SessionService } from './sessionService';

export const ChatService = {
  async getAllChats(session) {
    const token = SessionService.getSessionToken(session);
    // Menggunakan /all-chats (GET) sebagai alternatif paling dasar dan lengkap
    const { data } = await axiosInstance.get(`/${session}/all-chats`, {
      sessionToken: token
    });
    return data.response || data;
  },

  async getArchivedChats(session) {
    const token = SessionService.getSessionToken(session);
    try {
      const { data } = await axiosInstance.get(`/${session}/all-chats-archived`, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      console.warn("Could not fetch archived chats", err);
      return [];
    }
  },

  async getChatContact(session, chatId) {
    const token = SessionService.getSessionToken(session);
    const { data } = await axiosInstance.get(`/${session}/chat-by-id/${chatId}`, {
      sessionToken: token
    });
    return data.response || data;
  },

  async getProfilePic(session, chatId) {
    const token = SessionService.getSessionToken(session);
    try {
      const { data } = await axiosInstance.get(`/${session}/profile-pic/${chatId}`, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      console.warn("Could not fetch profile pic for", chatId);
      return null;
    }
  },

  async getContactDetail(session, phone) {
    const token = SessionService.getSessionToken(session);
    // Membersihkan ID jika ada @c.us untuk mendapatkan nomor murni
    const cleanPhone = phone.split('@')[0];
    const { data } = await axiosInstance.get(`/${session}/contact/${cleanPhone}`, {
      sessionToken: token
    });
    return data.response || data;
  },

  /**
   * Mengkonversi LID (Linked Identity) ke nomor telepon asli.
   * WhatsApp modern menggunakan format LID (e.g. 149027026923677@lid)
   * sebagai pengganti format lama (e.g. 6281234567890@c.us).
   * Endpoint ini mengembalikan nomor telepon yang sebenarnya.
   */
  async getPhoneFromLid(session, lid) {
    const token = SessionService.getSessionToken(session);
    const cleanLid = lid.split('@')[0];
    try {
      const { data } = await axiosInstance.get(`/${session}/contact/pn-lid/${cleanLid}`, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      console.warn("Could not resolve LID to phone number:", cleanLid, err);
      return null;
    }
  },

  async getLastSeen(session, phone) {
    const token = SessionService.getSessionToken(session);
    const cleanPhone = phone.split('@')[0];
    try {
      const { data } = await axiosInstance.get(`/${session}/last-seen/${cleanPhone}`, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      console.warn("Could not fetch last seen for", cleanPhone, err);
      return null;
    }
  },

  async subscribePresence(session, phone, isGroup = false) {
    const token = SessionService.getSessionToken(session);
    const cleanPhone = phone.split('@')[0];
    try {
      const { data } = await axiosInstance.post(`/${session}/subscribe-presence`, {
        phone: cleanPhone,
        isGroup: isGroup,
        all: false
      }, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      console.warn("Could not subscribe presence for", cleanPhone, err);
      return null;
    }
  }
};
