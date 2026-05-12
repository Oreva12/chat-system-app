import { useEffect, useRef, useState } from "react";
import Picker from "emoji-picker-react";

const EmojiPickerComponent = ({ onSelect, onClose }) => {
  const ref = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  /* Detect screen size */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* Close outside click + escape */
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("touchstart", handleClick);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  /* MOBILE */
  if (isMobile) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[9999] animate-slide-up">
        <div className="bg-card border-t border-border rounded-t-xl overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-border">
            <h3 className="text-white font-medium">Choose Emoji</h3>

            <button
              onClick={onClose}
              className="text-muted hover:text-light text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="w-full">
            <Picker
              onEmojiClick={(emoji) => {
                onSelect(emoji.emoji);
                onClose();
              }}
              theme="dark"
              width="100%"
              height="450px"
              searchPlaceholder="Search emojis..."
            />
          </div>
        </div>
      </div>
    );
  }

  /* DESKTOP */
  return (
    <div
      ref={ref}
      className="absolute bottom-14 left-0 z-[9999] rounded-xl overflow-hidden shadow-2xl border border-[#262A3A]"
    >
      <Picker
        onEmojiClick={(emojiData) => {
          onSelect(emojiData.emoji);
          onClose();
        }}
        theme="dark"
        width="340px"
        height="420px"
        searchPlaceholder="Search emojis..."
        previewConfig={{
          showPreview: false,
        }}
      />
    </div>
  );
};

export default EmojiPickerComponent;