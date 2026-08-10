import React, { useState, useEffect } from 'react';

// Cache global untuk menyimpan URL avatar agar tidak fetch berulang kali
const avatarCache = new Map();

export const ChatAvatar = ({ session, phone, isGroup, displayName, avatarColor, token }) => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvatar = async () => {
      // 0. Cek Cache terlebih dahulu
      const cacheKey = `${session}_${phone}`;
      if (avatarCache.has(cacheKey)) {
        setAvatarUrl(avatarCache.get(cacheKey));
        setLoading(false);
        return;
      }

      // 1. Ambil token dari prop, atau cari di localStorage jika prop kosong
      let activeToken = token;
      if (!activeToken && session) {
        activeToken = localStorage.getItem(`wpp_token_${session}`);
      }
      
      // 2. Batalkan jika masih tidak ada token atau data esensial
      if (!activeToken || !session || !phone) {
        if (!activeToken) console.warn(`[Avatar] Token missing for session: ${session}`);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const query = isGroup ? '?isGroup=true' : '';
        const url = `/api/${session}/profile-pic/${phone}${query}`;
        // Photo profile di-fetch langsung dari browser, jadi harus pakai
        // IP backend yang bisa dijangkau browser (bukan localhost, karena
        // backend & frontend beda mesin).
        const backendBase = 'http://192.168.1.15:21465';
        const absoluteUrl = `${backendBase}${url}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${activeToken.trim()}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        // Jika 401, coba lagi dengan URL absolut sebagai eliminasi masalah proxy
        if (response.status === 401) {
          const retryResponse = await fetch(absoluteUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${activeToken.trim()}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!retryResponse.ok) {
            setAvatarUrl(null);
            return;
          }
          
          const retryData = await retryResponse.json();
          handleSuccessData(retryData, cacheKey);
          return;
        }

        if (!response.ok) throw new Error('Gagal mengambil avatar');

        const data = await response.json();
        handleSuccessData(data, cacheKey);
        
      } catch (error) {
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    };

    const handleSuccessData = (data, cacheKey) => {
      if (data && data.status === 'success' && data.response) {
        const pic = data.response;
        let finalUrl = null;
        if (typeof pic === 'string') {
          finalUrl = pic;
        } else if (pic && pic.eurl) {
          finalUrl = pic.eurl;
        }
        
        if (finalUrl) {
          avatarCache.set(cacheKey, finalUrl);
          setAvatarUrl(finalUrl);
        } else {
          setAvatarUrl(null);
        }
      } else {
        setAvatarUrl(null);
      }
    };

    fetchAvatar();
  }, [session, phone, isGroup, token]);

  const initials = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: avatarUrl ? 'transparent' : avatarColor }}
    >
      {avatarUrl && !loading ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white text-lg font-medium uppercase select-none">
          {initials}
        </span>
      )}
    </div>
  );
};