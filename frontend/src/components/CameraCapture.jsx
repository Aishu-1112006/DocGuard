import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onFrameCaptured, onRetake, isVerifiedSuccess = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const loadDevices = async () => {
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devList.filter((d) => d.kind === "videoinput");
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  };

  const startCamera = async (deviceId) => {
    setCameraError("");
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
          ...(deviceId ? { deviceId: { exact: deviceId } } : {})
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            setVideoDimensions({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight
            });
            setIsLiveActive(
              videoRef.current.readyState >= 2 &&
              videoRef.current.videoWidth > 0
            );
          }
        };
      }
      await loadDevices();
    } catch (err) {
      setIsLiveActive(false);
      if (err.name === "NotAllowedError") {
        setCameraError("Camera access permission was denied. Please allow camera permissions in browser settings.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera device was detected on this computer.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is currently in use by another application or process.");
      } else {
        setCameraError(`Camera Error: ${err.message || err.name}`);
      }
    }
  };

  useEffect(() => {
    startCamera(selectedDeviceId);
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedDeviceId]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera stream not ready yet. Please wait for video initialization.");
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "live_face.jpg", { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCapturedImage(dataUrl);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setIsLiveActive(false);

      if (onFrameCaptured) {
        onFrameCaptured(file, dataUrl);
      }
    }, "image/jpeg", 0.92);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (onRetake) onRetake();
    startCamera(selectedDeviceId);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>LIVE PASSENGER CAMERA</span>
            {isLiveActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                ● CAMERA STREAM READY
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                INACTIVE
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500">ISO/IEC 19794-5 Biometric Portrait Specification</p>
        </div>

        {devices.length > 1 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 font-medium"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Diagnostics info bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-600 font-mono">
        <div>Resolution: {videoDimensions.width ? `${videoDimensions.width}x${videoDimensions.height}` : "Initializing…"}</div>
        <div>Devices: {devices.length || 1}</div>
        <div>Status: {isLiveActive ? "Streaming (24 FPS)" : capturedImage ? "Frame Captured" : "Standby"}</div>
      </div>

      {cameraError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center text-rose-800 text-xs space-y-2">
          <p className="font-bold text-sm">⚠️ Camera Initialization Failed</p>
          <p>{cameraError}</p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="px-3 py-1.5 bg-rose-800 text-white rounded text-xs font-semibold hover:bg-rose-900"
            >
              Retry Camera Access
            </button>
          </div>
        </div>
      ) : capturedImage ? (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 aspect-video max-h-80 flex items-center justify-center">
            <img src={capturedImage} alt="Captured Live Face" className="h-full object-cover" />
            <div className={`absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow ${isVerifiedSuccess ? "bg-emerald-800" : "bg-blue-800"}`}>
              {isVerifiedSuccess ? "✓ FACE CAPTURED & VERIFIED" : "📷 FRAME UPLOADED FOR BIOMETRIC MATCH"}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleRetake} className="btn-secondary text-xs">
              ↻ Retake Live Photo
            </button>
            <span className="text-xs text-slate-600 font-medium">
              Live Frame Captured ({videoDimensions.width || 1280}x{videoDimensions.height || 720})
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 aspect-video max-h-80 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-64 border-2 border-dashed border-sky-400 rounded-[50%] opacity-75 shadow-inner"></div>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur">
              Align passenger face within guide oval
            </div>
          </div>

          <button
            type="button"
            onClick={handleCapture}
            disabled={!isLiveActive}
            className="w-full btn-primary py-3 text-sm font-semibold shadow"
          >
            📷 Capture Live Passenger Photo
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
