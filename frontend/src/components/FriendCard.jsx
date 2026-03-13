import { UserPlus, UserMinus, UserCheck, Eye } from 'lucide-react';

const FriendCard = ({ user, actionType, onSelect, onAction, isSelected }) => {
  // actionType: 'select' (initial setup), 'add' (search), 'pending' (received request), 'sent' (sent request), 'friend' (current friend)

  return (
    <div 
      className={`border p-4 flex flex-col items-center bg-black/60 transition-all ${
        isSelected ? 'border-white neon-border transform scale-105' : 'border-stranger-red/50 hover:border-stranger-red'
      } ${actionType === 'select' ? 'cursor-pointer' : ''}`}
      onClick={actionType === 'select' ? onSelect : undefined}
    >
      <img 
        src={user.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'} 
        alt={user.name} 
        className="w-24 h-24 rounded-full object-cover border-2 border-stranger-red mb-4"
      />
      <h3 className="text-lg font-bold text-white uppercase tracking-wider text-center">{user.name}</h3>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-mono">[{user.username}]</p>
      
      {user.mutualFriends !== undefined && (
        <p className="text-xs text-gray-400 mb-4">{user.mutualFriends} Mutual Connections</p>
      )}

      {actionType === 'setup' && (
        <div className={`mt-2 py-1 px-4 text-xs font-bold uppercase tracking-widest ${isSelected ? 'bg-white text-black' : 'border border-stranger-red text-stranger-red'}`}>
          {isSelected ? 'Selected' : 'Select'}
        </div>
      )}

      {actionType === 'add' && (
        <button 
          onClick={(e) => { e.stopPropagation(); onAction('add', user._id); }}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 border border-stranger-red text-stranger-red hover:bg-stranger-red hover:text-black transition-colors uppercase text-xs tracking-widest"
        >
          <UserPlus size={16} /> Send Request
        </button>
      )}

      {actionType === 'pending' && (
        <div className="flex gap-2 w-full mt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onAction('accept', user._id); }}
            className="flex-1 flex items-center justify-center py-2 bg-stranger-red text-black hover:bg-white transition-colors uppercase text-xs tracking-widest font-bold"
          >
            Accept
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAction('decline', user._id); }}
            className="flex-1 flex items-center justify-center py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-colors uppercase text-xs font-bold"
          >
            Deny
          </button>
        </div>
      )}

      {actionType === 'friend' && (
        <div className="flex gap-2 w-full mt-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onAction('view', user._id); }}
                className="flex-[2] flex items-center justify-center py-2 bg-white/10 hover:bg-white/20 text-white transition-colors uppercase text-xs tracking-widest"
            >
                <Eye size={16} className="mr-2" /> View
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onAction('remove', user._id); }}
                className="flex-1 flex items-center justify-center py-2 border border-red-900 text-red-700 hover:bg-red-900 hover:text-white transition-colors"
                title="Remove connection"
            >
                <UserMinus size={16} />
            </button>
        </div>
      )}
    </div>
  );
};

export default FriendCard;
