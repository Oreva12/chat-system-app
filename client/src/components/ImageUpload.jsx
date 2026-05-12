import { useRef, useState } from "react";

const MAX_SIZE_MB  = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ImageUpload = ({ onUpload, disabled }) => {
  const inputRef           = useRef(null);
  const [error, setError]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader  = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      onUpload({ base64, name: file.name, type: file.type, size: file.size });
    } catch (err) {
      setError("Failed to read image");
    } finally {
      setLoading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="image-upload"
        disabled={disabled || loading}
      />
      <label
        htmlFor="image-upload"
        className={`flex items-center justify-center w-9 h-9 rounded-lg
                    border border-border cursor-pointer transition-colors
                    ${disabled || loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-border/50 hover:border-light/30"}`}
        title="Upload image"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-blue border-t-transparent
                          rounded-full animate-spin" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#6B7280" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
      </label>
      {error && (
        <div className="absolute bottom-full mb-2 right-0 bg-pink/10
                        border border-pink/30 text-pink text-xs px-3 py-1.5
                        rounded-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;