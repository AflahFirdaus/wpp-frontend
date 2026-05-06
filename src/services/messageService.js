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
  // If it's an object, try _serialized, then id, then remote
  return id._serialized || id.id || (typeof id === 'object' ? JSON.stringify(id) : id);
};

export const MessageService = {
  async getMessages(session, chatId, isGroup = false) {
    const token = SessionService.getSessionToken(session);
    const { data } = await axiosInstance.get(`/${session}/get-messages/${chatId}?count=100`, {
      sessionToken: token
    });
    return data.response || data;
  },

  async sendMessage(session, phone, message, isGroup = false, replyMessageId = null, isForwarded = false) {
    const token = SessionService.getSessionToken(session);
    const targetPhone = Array.isArray(phone) ? phone[0] : phone;
    const sanitizedPhone = sanitizePhone(targetPhone);
    const finalReplyId = sanitizeId(replyMessageId);

    const payload = {
      phone: sanitizedPhone,
      to: sanitizedPhone,
      message,
      isGroup
    };

    if (finalReplyId) {
      payload.messageId = finalReplyId;
    }

    try {
      const endpoint = finalReplyId ? `/${session}/send-reply` : `/${session}/send-message`;
      const { data } = await axiosInstance.post(endpoint, payload, {
        sessionToken: token
      });
      return data.response || data;
    } catch (err) {
      throw err;
    }
  },

  async sendFile(session, phone, file, caption = '', isGroup = false, replyMessageId = null) {
    const token = SessionService.getSessionToken(session);
    const targetPhone = Array.isArray(phone) ? phone[0] : phone;
    const sanitizedPhone = sanitizePhone(targetPhone);

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const finalReplyId = sanitizeId(replyMessageId);
    const payload = {
      phone: sanitizedPhone,
      isGroup,
      filename: file.name,
      caption,
      base64
    };

    if (finalReplyId) {
      payload.messageId = finalReplyId;
      payload.quotedMsg = finalReplyId;
    }

    const { data } = await axiosInstance.post(`/${session}/send-file-base64`, payload, {
      sessionToken: token
    });
    return data.response || data;
  },

  async forwardMessage(session, phone, messageId, isGroup = false, fallbackObj = null) {
    const token = SessionService.getSessionToken(session);
    const targetPhone = Array.isArray(phone) ? phone[0] : phone;
    const sanitizedPhone = sanitizePhone(targetPhone);
    const sanitizedMsgId = sanitizeId(messageId);

    // MATCHING LOG PATTERN: 
    // [Forward] Target: STRING, MessageIDs: ARRAY
    const payload = {
      phone: sanitizedPhone,
      isGroup: !!isGroup,
      messageId: sanitizedMsgId
    };

    try {
      console.log('[Forward] Sending request to backend...', payload);
      const { data } = await axiosInstance.post(`/${session}/forward-messages`, payload, {
        sessionToken: token
      });
      console.log('[Forward] Backend responded:', data);
      return data.response || data;
    } catch (err) {
      console.error('[Forward] Axios Error:', err.response?.data || err.message);
      throw err;
    }
  },

  async downloadMedia(session, messageOrId) {
    const token = SessionService.getSessionToken(session);
    const { data } = await axiosInstance.post(`/${session}/download-media`, {
      messageId: messageOrId
    }, {
      sessionToken: token
    });
    return data;
  }
};
