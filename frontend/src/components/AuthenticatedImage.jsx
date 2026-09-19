import { useState, useEffect } from "react";
import api from "../api.js";

export default function AuthenticatedImage({
  src,
  alt = "Document",
  className = "",
  style = {},
  onClick,
  fallbackText = "Unable to load document image"
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let createdUrl = null;

    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    if (src.startsWith("blob:") || src.startsWith("data:")) {
      setBlobUrl(src);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    api
      .get(src, { responseType: "blob" })
      .then((res) => {
        if (isMounted) {
          createdUrl = URL.createObjectURL(res.data);
          setBlobUrl(createdUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load authenticated image:", src, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-medium p-4 rounded ${className}`}
        style={style}
      >
        <span className="animate-pulse">Loading document image...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded p-4 text-center text-slate-500 text-xs ${className}`}
        style={style}
      >
        <span className="text-sm">⚠️</span>
        <span className="mt-1 font-semibold text-slate-700">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
}
