import { useState, useRef, useEffect } from 'react';
import { Check, Pencil, Trash2, X, CornerUpLeft } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const MessageContent = ({ message }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const inputRef = useRef(null);
  const { editMessage, deleteMessage, setReplyingTo } = useChatStore();
  const { authUser } = useAuthStore();

  const isOwnMessage = message.senderId === authUser._id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = async () => {
    if (editedText.trim() === message.text) {
      setIsEditing(false);
      return;
    }

    if (editedText.trim() !== '') {
      await editMessage(message._id, editedText);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedText(message.text);
    }
  };

  if (message.isDeleted) {
    return (
      <div className="chat-bubble bg-base-300 text-base-content/70 italic">
        {message.text}
      </div>
    );
  }

  return (
    <div className="chat-bubble flex flex-col relative group">
      {/* Reply reference if message is a reply */}
      {message.replyTo && (
        <div className="text-sm text-base-content/70 mb-1 bg-base-300/50 p-1 rounded">
          Replying to: {message.replyTo.text}
        </div>
      )}

      {/* Message content */}
      {message.image && (
        <img
          src={message.image}
          alt="Attachment"
          className="sm:max-w-[200px] rounded-md mb-2"
        />
      )}

      {isEditing ? (
        <div className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={handleKeyPress}
            className="textarea textarea-bordered textarea-sm min-h-[2rem] flex-1"
            autoFocus
          />
          <button onClick={handleEdit} className="btn btn-circle btn-ghost btn-xs">
            <Check className="size-4" />
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditedText(message.text);
            }}
            className="btn btn-circle btn-ghost btn-xs"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <p>{message.text}</p>
          {message.isEdited && (
            <span className="text-xs text-base-content/50">(edited)</span>
          )}
        </>
      )}

      {/* Action buttons */}
      {isOwnMessage && !isEditing && (
        <div className="absolute -top-4 right-0 hidden group-hover:flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-circle btn-ghost btn-xs"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={() => deleteMessage(message._id)}
            className="btn btn-circle btn-ghost btn-xs text-error"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}

      {/* Reply button - visible for all messages */}
      <button
        onClick={() => setReplyingTo(message)}
        className="absolute -top-4 right-0 hidden group-hover:flex items-center gap-1"
        style={{ right: isOwnMessage ? '4rem' : 0 }}
      >
        <div className="btn btn-circle btn-ghost btn-xs">
          <CornerUpLeft className="size-3" />
        </div>
      </button>
    </div>
  );
};

export default MessageContent;