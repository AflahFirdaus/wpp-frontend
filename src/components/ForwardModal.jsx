import React, { useState } from 'react';
import { X, Search, User, Users } from 'lucide-react';
import { getChatName, getAvatarColor, getChatId } from '../utils/chatUtils';

export const ForwardModal = ({ chats, onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = chats?.filter(chat => {
    const name = getChatName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#2a3942] w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border border-white/10">

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/5 bg-[#202c33]">
          <h3 className="text-[19px] font-medium text-[#e9edef]">Teruskan pesan ke</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-[#8696a0] hover:text-[#e9edef] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-[#111b21]">
          <div className="bg-[#202c33] flex items-center h-[40px] px-4 rounded-xl gap-3">
            <Search size={18} className="text-[#8696a0]" />
            <input
              type="text"
              placeholder="Cari kontak atau grup"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="bg-transparent border-none outline-none text-[14.5px] w-full placeholder:text-[#8696a0] text-[#d1d7db]"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          {filtered && filtered.length > 0 ? (
            filtered.map((chat) => {
              const chatId = getChatId(chat);
              const isGroup = chat.isGroup || chatId?.includes('@g.us');
              return (
                <div
                  key={chatId}
                  onClick={() => onSelect(chatId)}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-[#202c33] cursor-pointer transition-colors group"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: chat.avatar ? 'transparent' : getAvatarColor(chatId) }}
                  >
                    {chat.avatar ? (
                      <img src={chat.avatar} alt="chat" className="w-full h-full object-cover" />
                    ) : (
                      isGroup ? <Users size={20} className="text-white/80" /> : <User size={20} className="text-white/80" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e9edef] text-[16px] truncate font-normal">
                      {getChatName(chat)}
                    </p>
                    <p className="text-[#8696a0] text-[13px] truncate">
                      {isGroup ? 'Grup' : 'Kontak'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-[#8696a0] text-[14px]">
              Tidak ada hasil ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
