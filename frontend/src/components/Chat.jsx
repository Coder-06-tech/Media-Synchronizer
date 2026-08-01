import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, ShieldAlert } from 'lucide-react';

const Chat = ({ roomId, socket, user }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg) => {
            setChatHistory((prev) => [...prev, msg]);
        };

        socket.on('receive_message', handleMessage);
        return () => socket.off('receive_message', handleMessage);
    }, [socket]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;

        socket.emit('send_message', {
            roomId,
            message,
            user: {
                id: user._id,
                name: user.name || user.username,
                avatar: user.profilePic
            }
        });
        setMessage('');
    };

    return (
        <div className="flex flex-col h-full glass-card border border-stranger-red/30 shadow-2xl relative overflow-hidden min-h-[500px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-stranger-red/20 bg-white/40 flex items-center justify-between z-10">
                <span className="font-orbitron text-[10px] tracking-[0.2em] text-stranger-red flex items-center gap-2">
                    <ShieldAlert size={14} /> SECURE COMMS
                </span>
                <span className="text-[8px] text-slate-600 font-mono hidden md:block">CHANNEL: {roomId.split('-')[0]}</span>
            </div>

            {/* Messages Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative z-10"
            >
                {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                        <UserIcon size={48} className="text-slate-600 mb-2 truncate" />
                        <p className="text-[10px] font-orbitron tracking-widest">AWAITING TRANSMISSIONS...</p>
                    </div>
                )}
                {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender.id === user._id ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 mb-1 ${msg.sender.id === user._id ? 'flex-row-reverse' : ''}`}>
                            {msg.sender.avatar ? (
                                <img src={msg.sender.avatar} alt="" className="w-4 h-4 rounded-full border border-gray-600" />
                            ) : (
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender.name}`} alt="" className="w-4 h-4 rounded-full border border-gray-600" />
                            )}
                            <span className="text-[10px] uppercase font-orbitron tracking-tighter text-slate-600">
                                {msg.sender.name}
                            </span>
                            <span className="text-[8px] text-gray-700 font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className={`max-w-[85%] px-4 py-3 text-sm font-outfit leading-relaxed shadow-lg ${
                            msg.sender.id === user._id 
                            ? 'bg-stranger-red/10 border-r-2 border-stranger-red text-slate-900 rounded-l-lg' 
                            : 'bg-slate-200/40 border-l-2 border-gray-500 text-slate-800 rounded-r-lg'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white/60 border-t border-stranger-red/20 flex gap-2 relative z-10">
                <input 
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="TYPE MESSAGE..."
                    className="flex-1 bg-transparent border-b border-stranger-red/40 p-2 text-xs text-slate-900 font-outfit focus:border-stranger-red outline-none transition-all"
                />
                <button 
                    type="submit"
                    className="p-2 bg-stranger-red text-black hover:bg-white transition-colors duration-300 shadow-[0_0_15px_rgba(0, 86, 179,0.3)]"
                >
                    <Send size={16} />
                </button>
            </form>

            {/* CRT Flicker Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('https://media.giphy.com/media/oEI9uWUqW8Kbg9Tsu5/giphy.gif')] bg-cover"></div>
        </div>
    );
};

export default Chat;
