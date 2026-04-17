import axiosInstance from '../api/axiosInstance';
import { SessionService } from './sessionService';

// Helper to ensure phone has the correct suffix
const sanitizePhone = (phone) => {
  if (!phone) return phone;
  if (typeof phone !== 'string') return phone;
  if (phone.includes('@')) return phone;
  return `${phone}@c.us`;
};

// Helper to ensure we are sending a string ID, not an object
const sanitizeId = (id) => {
  if (!id) return id;
  if (typeof id === 'string') return id;
  return id._serialized || id;
};

export const MessageService = {
  async getMessages(session, chatId, isGroup = false) {
    const token = SessionService.getSessionToken(session);
    // Menggunakan get-messages dengan count=100 agar histori terisi banyak saat awal masuk
    const { data } = await axiosInstance.get(`/${session}/get-messages/${chatId}`, {
      params: {
        count: 100,
        direction: 'before' // Mengambil pesan sebelum waktu sekarang (histori)
      },
      sessionToken: token
    });
    return data.response || data;
  },

  async sendMessage(session, phone, message, isGroup = false, replyMessageId = null) {
    const token = SessionService.getSessionToken(session);

    let phones = Array.isArray(phone) ? phone : [phone];
    phones = phones.map(sanitizePhone);

    const finalReplyId = sanitizeId(replyMessageId);

    // If replying, use the dedicated /send-reply endpoint (patched backend with @lid fallback)
    if (finalReplyId) {
      console.log(`[MessageService] Sending REPLY to ${session}/send-reply:`, {
        phone: phones, message, messageId: finalReplyId
      });
      const { data } = await axiosInstance.post(`/${session}/send-reply`, {
        phone: phones,
        message,
        messageId: finalReplyId
      }, {
        sessionToken: token
      });
      return data.response || data;
    }

    // Normal message (no reply)
    const payload = {
      phone: phones,
      message,
      isGroup
    };

    console.log(`[MessageService] Sending to ${session}/send-message:`, payload);
    const { data } = await axiosInstance.post(`/${session}/send-message`, payload, {
      sessionToken: token
    });
    return data.response || data;
  },

  /**
   * Mengirim file (mendukung caption dan reply)
   */
  async sendFile(session, phone, file, caption = '', isGroup = false, replyMessageId = null) {
    const token = SessionService.getSessionToken(session);
    let phones = Array.isArray(phone) ? phone : [phone];
    phones = phones.map(sanitizePhone);

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const payload = {
      phone: phones,
      isGroup,
      filename: file.name,
      caption,
      base64,
    };

    const finalReplyId = sanitizeId(replyMessageId);
    if (finalReplyId && !finalReplyId.includes('@lid')) {
      payload.quotedMessageId = finalReplyId;
    }

    try {
      console.log(`[MessageService] Sending to ${session}/send-file-base64:`, { ...payload, base64: 'base64_data...' });
      const { data } = await axiosInstance.post(`/${session}/send-file-base64`, payload, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      if (payload.quotedMessageId && err.response?.status === 500) {
        console.warn('[MessageService] File Reply failed (500), retrying as normal file send...');
        delete payload.quotedMessageId;
        const { data } = await axiosInstance.post(`/${session}/send-file-base64`, payload, {
          sessionToken: token
        });
        return data.response || data;
      }
      throw err;
    }
  },

  async forwardMessage(session, phone, messageId, isGroup = false) {
    const token = SessionService.getSessionToken(session);

    // Pastikan phone adalah string (ambil yang pertama jika array) sesuai dokumentasi API
    // Namun messageId seringkali membutuhkan format array pada endpoint plural
    const targetPhone = Array.isArray(phone) ? phone[0] : phone;
    const sanitizedPhone = sanitizePhone(targetPhone);

    const payload = {
      phone: sanitizedPhone,
      isGroup,
      messageId: [sanitizeId(messageId)]
    };

    console.log(`[MessageService] Sending to ${session}/forward-messages:`, payload);

    const { data } = await axiosInstance.post(`/${session}/forward-messages`, payload, {
      sessionToken: token
    });
    return data.response || data;
  },

  /**
   * Mengunduh file media asli beresolusi tinggi.
   */
  async downloadMedia(session, messageId) {
    const token = SessionService.getSessionToken(session);
    const { data } = await axiosInstance.post(`/${session}/download-media`, {
      messageId
    }, {
      sessionToken: token
    });
    // wppconnect terkadang me-return string base64 biasa atau base64 terenkapsulasi
    return data;
  }
};
