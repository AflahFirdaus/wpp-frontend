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
  
  // 1. Identifikasi ID dasar
  const idUser = chat.id?.user || (typeof chat.id === 'string' ? chat.id.split('@')[0] : '');
  const isGroup = chat.isGroup || chat.id?._serialized?.includes('@g.us') || (typeof chat.id === 'string' && chat.id.includes('@g.us'));

  // 2. Daftar kandidat nama (Urutan prioritas)
  const candidates = [
    chat.name,
    chat.pushname,
    chat.formattedTitle,
    chat.contact?.name,
    chat.contact?.pushname,
    chat.contact?.formattedName,
    chat.contact?.shortName,
    chat.title
  ];

  for (const cand of candidates) {
    if (cand && typeof cand === 'string' && cand.trim() !== "") {
      // Jika kandidat mengandung huruf, kemungkinan besar itu nama asli
      if (/[a-zA-Z]/.test(cand)) return cand;
      
      // Jika bukan nomor HP yang sama persis dengan ID, ambil saja
      if (cand !== idUser && !cand.includes('@')) return cand;
    }
  }

  // 3. Fallback khusus Grup
  if (isGroup) {
    return chat.name || chat.formattedTitle || 'Grup WhatsApp';
  }

  // 4. Fallback Nomor Telepon
  if (idUser) {
    return idUser.length > 15 ? 'Kontak Baru' : '+' + idUser;
  }
  
  return 'Kontak Baru';
};

export const getLastMessageText = (chat) => {
  if (!chat) return '';

  // 1. Prioritas: Ambil dari objek lastMessage
  let msg = chat.lastMessage || chat.lastMsg;

  // 2. Fallback: Ambil pesan terakhir dari array msgs jika ada
  if (!msg && chat.msgs && chat.msgs.length > 0) {
    msg = chat.msgs[chat.msgs.length - 1];
  }

  if (!msg) return 'Belum ada pesan';

  // 3. Jika pesan ditarik
  if (msg.type === 'revoked' || msg.type === 'protocol') return "🚫 Pesan ini telah dihapus";

  // 4. Deteksi Tipe Media & Teks
  const typeMap = {
    'image': '📷 Foto',
    'video': '🎥 Video',
    'audio': '🎵 Audio',
    'ptt': '🎤 Pesan Suara',
    'document': '📄 Dokumen',
    'sticker': '🎨 Stiker',
    'location': '📍 Lokasi',
    'vcard': '👤 Kontak',
    'call_log': '📞 Panggilan'
  };

  if (typeMap[msg.type]) {
    const caption = msg.caption || '';
    return typeMap[msg.type] + (caption ? ': ' + caption : '');
  }

  // 5. Ekstraksi Konten Teks
  return msg.body || msg.content || msg.text || 'Pesan Media';
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

// Fungsi untuk memanggil API avatar
export const fetchAvatarUrl = async (session, phone, isGroup, token) => {
  try {
    // Tambahkan parameter isGroup jika bernilai true
    const query = isGroup ? '?isGroup=true' : '';
    const url = `/api/${session}/profile-pic/${phone}${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Masukkan token kamu di sini
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Gagal fetch avatar');
    
    // Asumsi backend mengembalikan JSON berisi URL gambar (sesuaikan dengan respon backendmu)
    const data = await response.json(); 
    return data.profilePicUrl; // Ganti .profilePicUrl sesuai key JSON dari backend kamu

  } catch (error) {
    console.error("Error fetching avatar:", error);
    return null; // Kembalikan null jika gagal
  }
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
