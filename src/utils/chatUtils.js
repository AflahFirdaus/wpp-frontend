/**
 * Utility functions for chat and message handling
 */

// Helper untuk mengekstrak ID secara murni (Pure)
export const getChatId = (chat) => {
  if (!chat) return null;
  if (chat.id?._serialized) return chat.id._serialized;
  if (typeof chat.id === 'string') return chat.id;
  if (chat._serialized) return chat._serialized;
  return null;
};

// Helper untuk mencari Nama atau Nomor Telepon yang paling tepat
export const getChatName = (chat) => {
  if (!chat) return 'Unknown';
  
  // 1. Cek properti nama standar (Pastikan itu string, bukan object Wid)
  if (chat.name && typeof chat.name === 'string') return chat.name;
  if (chat.pushname && typeof chat.pushname === 'string') return chat.pushname;
  
  // 2. Cek apakah namanya ada di dalam object 'contact'
  if (chat.contact?.name && typeof chat.contact.name === 'string') return chat.contact.name;
  if (chat.contact?.pushname && typeof chat.contact.pushname === 'string') return chat.contact.pushname;

  // 3. Jika tidak ada nama sama sekali, tampilkan nomor teleponnya!
  const idString = getChatId(chat);
  if (idString && idString.includes('@')) {
    // Memecah "628123456789@c.us" menjadi "628123456789"
    return '+' + idString.split('@')[0];
  }
  
  // 4. Fallback terakhir jika datanya benar-benar kosong
  return 'Kontak Baru';
};

// Helper pintar untuk membaca pesan terakhir beserta jenis medianya
export const getLastMessageText = (chat) => {
  if (!chat) return 'Belum ada pesan';

  // 1. Cari objek pesan terakhir (Logika kamu sudah bagus, kita rapikan sedikit)
  let msg = chat.lastMessage || chat.lastMsg;
  
  if (!msg && chat.msgs) {
    if (Array.isArray(chat.msgs) && chat.msgs.length > 0) {
      msg = chat.msgs[chat.msgs.length - 1];
    } else if (typeof chat.msgs === 'object') {
      const models = chat.msgs._models || chat.msgs.models || [];
      if (models.length > 0) msg = models[models.length - 1];
    }
  }

  // 2. Jika tetap tidak ada objek pesan, kembalikan teks default
  if (!msg) return 'Belum ada pesan';

  // 3. LOGIKA EKSTRAKSI TEKS (Penting: Menangani berbagai jenis data)
  
  // Jika pesan dihapus (Revoked)
  if (msg.type === 'revoked' || msg.isRevoked) return '🚫 Pesan ini telah dihapus';

  // Ambil body/caption
  const content = msg.body || msg.caption || msg.text || '';

  // Tangani jenis media (WhatsApp style)
  switch (msg.type) {
    case 'image':
      return `📷 ${content || 'Foto'}`;
    case 'video':
      return `🎥 ${content || 'Video'}`;
    case 'audio':
    case 'ptt':
      return `🎤 Pesan suara`;
    case 'document':
      return `📄 ${msg.filename || 'Dokumen'}`;
    case 'sticker':
      return `🏷️ Stiker`;
    case 'location':
      return `📍 Lokasi`;
    case 'vcard':
    case 'multi_vcard':
      return `👤 Kontak`;
    default:
      // Jika pesan teks biasa
      return content || 'Pesan media';
  }
};

// Generate a stable color based on the chat's unique ID
export const getAvatarColor = (id) => {
  if (!id) return '#51585c';
  const colors = [
    '#00a884', '#007bfc', '#00d26a', '#ff9f00', '#eb5545',
    '#a333c8', '#00b5ad', '#2185d0', '#6435c9', '#e03997'
  ];
  const stringId = String(id);
  const charSum = stringId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

// Helper untuk format status "Terakhir Dilihat" (Last Seen)
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return null;
  
  // WPPConnect mengembalikan timestamp dalam milidetik atau detik
  // Pastikan dikonversi ke Date object
  const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  if (isToday) {
    return `terakhir dilihat hari ini pukul ${timeStr}`;
  } else if (isYesterday) {
    return `terakhir dilihat kemarin pukul ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `terakhir dilihat ${dateStr} pukul ${timeStr}`;
  }
};
