import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Loader2 } from "lucide-react";

interface Props {
  onDecoded: (value: string) => void;
  active: boolean;
}

export function QrScanner({ onDecoded, active }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "denied" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
        if (code && code.data) {
          stop();
          onDecoded(code.data);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onDecoded, stop]);

  const start = useCallback(async () => {
    setStatus("starting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      setStatus("scanning");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setStatus("error");
        setErrorMsg(e?.message ?? "Could not access camera.");
      }
    }
  }, [tick]);

  useEffect(() => {
    if (active) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border bg-black aspect-square sm:aspect-video">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Reticle overlay */}
      {status === "scanning" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-2/3 w-2/3 max-w-xs max-h-xs">
            <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
            <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
            <span className="absolute left-0 bottom-0 h-8 w-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
            <span className="absolute right-0 bottom-0 h-8 w-8 border-r-4 border-b-4 border-primary rounded-br-lg" />
          </div>
        </div>
      )}

      {status === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Starting camera…</p>
        </div>
      )}

      {status === "denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
          <CameraOff className="h-8 w-8" />
          <p className="text-sm">Camera permission was denied. Enable it in your browser settings and tap retry.</p>
          <Button size="sm" variant="secondary" onClick={start}>
            <Camera className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
          <CameraOff className="h-8 w-8" />
          <p className="text-sm">{errorMsg || "Couldn't open the camera."}</p>
          <Button size="sm" variant="secondary" onClick={start}>Try again</Button>
        </div>
      )}
    </div>
  );
}