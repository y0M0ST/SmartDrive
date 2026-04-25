import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FACE_MATCH_THRESHOLD,
  faceDistanceToMatchScore,
  getFaceDescriptor,
  loadFaceModels,
  type FaceDescriptorSnapshot,
} from "@/lib/ai/faceAuth";
import { driverApi, unwrapFaceTemplate } from "@/services/driverApi";

const SCAN_INTERVAL_MS = 500;
const REQUIRED_STREAK = 3;
const MAX_MISMATCH_BEFORE_LOCK = 5;

const LOCKED_UI_FALLBACK =
  "Tài khoản bị tạm khóa điểm danh do thử sai quá nhiều lần. Vui lòng liên hệ bộ phận vận hành (Agency) để mở khóa.";

export type FaceScannerMode = "register" | "checkin";

type FaceScannerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: FaceScannerMode;
  /** Bắt buộc khi `mode === "checkin"`. */
  tripId?: string;
  onComplete: () => void;
};

type Phase = "idle" | "loading" | "scanning" | "submitting" | "error" | "locked";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function drawFaceBox(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  faceApiResult: FaceDescriptorSnapshot["faceApiResult"],
  ok: boolean,
) {
  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  if (!displaySize.width || !displaySize.height) return;
  faceapi.matchDimensions(canvas, displaySize);
  const resized = faceapi.resizeResults(faceApiResult, displaySize);
  const box = resized.detection.box;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ok ? "#22c55e" : "#ef4444";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}

export function FaceScannerModal({
  open,
  onOpenChange,
  mode,
  tripId,
  onComplete,
}: FaceScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const templateRef = useRef<Float32Array | null>(null);
  const anchorRef = useRef<Float32Array | null>(null);
  const streakRef = useRef(0);

  const bestMatchScoreRef = useRef(0);
  const lockTriggeredRef = useRef(false);
  const failedAttemptsRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  const onOpenChangeRef = useRef(onOpenChange);
  onCompleteRef.current = onComplete;
  onOpenChangeRef.current = onOpenChange;

  const [phase, setPhase] = useState<Phase>("idle");
  const [statusLine, setStatusLine] = useState("");
  const [streakUi, setStreakUi] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockMessage, setLockMessage] = useState(LOCKED_UI_FALLBACK);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cleanupCapture = useCallback(() => {
    stopInterval();
    stopStream(streamRef.current);
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    }
    templateRef.current = null;
    anchorRef.current = null;
    streakRef.current = 0;
    setStreakUi(0);
    bestMatchScoreRef.current = 0;
    lockTriggeredRef.current = false;
    failedAttemptsRef.current = 0;
    setFailedAttempts(0);
  }, [stopInterval]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupCapture();
      setPhase("idle");
      setStatusLine("");
      setLockMessage(LOCKED_UI_FALLBACK);
      return;
    }

    bestMatchScoreRef.current = 0;
    lockTriggeredRef.current = false;
    failedAttemptsRef.current = 0;
    setFailedAttempts(0);

    let cancelled = false;

    const startScanLoop = () => {
      stopInterval();
      intervalRef.current = setInterval(() => {
        void tick();
      }, SCAN_INTERVAL_MS);
    };

    const triggerLockFromClient = async () => {
      if (lockTriggeredRef.current || cancelled) return;
      lockTriggeredRef.current = true;
      stopInterval();
      setPhase("submitting");
      setStatusLine("Đang khóa điểm danh trên hệ thống…");
      const matchScore = bestMatchScoreRef.current;
      try {
        const res = await driverApi.checkinTrip(tripId!, { result: "LOCKED", matchScore });
        const body = res.data as { message?: string; data?: { locked?: boolean } } | undefined;
        const msg =
          typeof body?.message === "string" && body.message.trim() !== "" ? body.message : LOCKED_UI_FALLBACK;
        setLockMessage(msg);
        cleanupCapture();
        setPhase("locked");
        toast.error(msg, { duration: 12_000 });
        onCompleteRef.current();
      } catch {
        toast.error("Không thể đồng bộ trạng thái khóa với máy chủ. Vui lòng liên hệ nhà xe.");
        setLockMessage(
          "Không thể xác nhận khóa với máy chủ. Vui lòng liên hệ bộ phận vận hành (Agency) và không tiếp tục thử điểm danh.",
        );
        cleanupCapture();
        setPhase("locked");
        onCompleteRef.current();
      }
    };

    const tick = async () => {
      if (cancelled || lockTriggeredRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const snap = await getFaceDescriptor(video);
      if (!snap) {
        streakRef.current = 0;
        setStreakUi(0);
        if (mode === "register") anchorRef.current = null;
        clearCanvas();
        return;
      }

      if (mode === "checkin") {
        const template = templateRef.current;
        if (!template) return;
        const distance = faceapi.euclideanDistance(template, snap.descriptor);
        const score = faceDistanceToMatchScore(distance);
        bestMatchScoreRef.current = Math.max(bestMatchScoreRef.current, score);

        const ok = distance < FACE_MATCH_THRESHOLD;
        drawFaceBox(canvas, video, snap.faceApiResult, ok);
        if (ok) {
          failedAttemptsRef.current = 0;
          setFailedAttempts(0);
          streakRef.current += 1;
          setStreakUi(streakRef.current);
          if (streakRef.current >= REQUIRED_STREAK) {
            stopInterval();
            setPhase("submitting");
            setStatusLine("Đang xác nhận điểm danh…");
            const matchScore = faceDistanceToMatchScore(distance);
            try {
              await driverApi.checkinTrip(tripId!, { result: "SUCCESS", matchScore });
              toast.success("Điểm danh thành công. Chuyến đi đã chuyển sang đang chạy.");
              cleanupCapture();
              onCompleteRef.current();
              onOpenChangeRef.current(false);
            } catch {
              toast.error("Gửi điểm danh thất bại. Thử lại.");
              streakRef.current = 0;
              setStreakUi(0);
              setPhase("scanning");
              setStatusLine("Lỗi khi gửi máy chủ. Tiếp tục quét…");
              startScanLoop();
            }
          }
        } else {
          streakRef.current = 0;
          setStreakUi(0);
          failedAttemptsRef.current += 1;
          setFailedAttempts(failedAttemptsRef.current);
          if (failedAttemptsRef.current >= MAX_MISMATCH_BEFORE_LOCK) {
            void triggerLockFromClient();
          }
        }
        return;
      }

      let anchor = anchorRef.current;
      if (!anchor) {
        anchor = snap.descriptor;
        anchorRef.current = anchor;
        streakRef.current = 1;
        setStreakUi(1);
        drawFaceBox(canvas, video, snap.faceApiResult, true);
        return;
      }
      const distance = faceapi.euclideanDistance(anchor, snap.descriptor);
      const ok = distance < FACE_MATCH_THRESHOLD;
      drawFaceBox(canvas, video, snap.faceApiResult, ok);
      if (ok) {
        streakRef.current += 1;
        setStreakUi(streakRef.current);
        if (streakRef.current >= REQUIRED_STREAK) {
          stopInterval();
          setPhase("submitting");
          setStatusLine("Đang lưu mẫu khuôn mặt…");
          const encoding = Array.from(snap.descriptor);
          try {
            await driverApi.saveFaceTemplate(encoding);
            toast.success("Đã lưu mẫu khuôn mặt thành công.");
            cleanupCapture();
            onCompleteRef.current();
            onOpenChangeRef.current(false);
          } catch {
            toast.error("Không lưu được mẫu. Thử lại.");
            streakRef.current = 0;
            setStreakUi(0);
            anchorRef.current = null;
            setPhase("scanning");
            setStatusLine("Lỗi khi gửi máy chủ. Tiếp tục quét…");
            startScanLoop();
          }
        }
      } else {
        streakRef.current = 0;
        setStreakUi(0);
        anchorRef.current = null;
      }
    };

    const run = async () => {
      setPhase("loading");
      setStatusLine("Đang tải model…");
      try {
        await loadFaceModels();
        if (cancelled) return;

        if (mode === "checkin") {
          if (!tripId) {
            setPhase("error");
            setStatusLine("Thiếu mã chuyến đi.");
            return;
          }
          try {
            const res = await driverApi.getFaceTemplate();
            const parsed = unwrapFaceTemplate(res);
            if (!parsed?.faceEncoding?.length) {
              setPhase("error");
              setStatusLine("Chưa có mẫu khuôn mặt trên hệ thống. Hãy đăng ký trước.");
              return;
            }
            if (parsed.is_locked) {
              setPhase("error");
              setStatusLine(
                "Tài khoản điểm danh khuôn mặt đang bị khóa. Vui lòng liên hệ nhà xe / Agency để được mở khóa.",
              );
              return;
            }
            templateRef.current = new Float32Array(parsed.faceEncoding);
          } catch (e: unknown) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
              setPhase("error");
              setStatusLine("Bạn chưa đăng ký mẫu khuôn mặt. Vui lòng đăng ký trước khi bắt đầu chuyến.");
            } else {
              setPhase("error");
              setStatusLine("Không tải được mẫu khuôn mặt từ máy chủ.");
            }
            return;
          }
        }

        setStatusLine("Đang bật camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stopStream(stream);
          return;
        }
        video.srcObject = stream;
        await video.play();

        setPhase("scanning");
        setStatusLine(
          mode === "checkin"
            ? "Nhìn thẳng vào camera. Giữ khuôn mặt trong khung xanh…"
            : "Nhìn thẳng vào camera để đăng ký (3 lần khớp liên tiếp).",
        );
        startScanLoop();
      } catch {
        if (!cancelled) {
          setPhase("error");
          setStatusLine("Không mở được camera hoặc tải model thất bại. Kiểm tra quyền trình duyệt.");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      cleanupCapture();
    };
  }, [open, mode, tripId, cleanupCapture, clearCanvas, stopInterval]);

  const isLockedOrSubmitting = phase === "submitting" || phase === "locked";
  const title =
    phase === "locked"
      ? "Điểm danh bị khóa"
      : mode === "checkin"
        ? "Xác nhận khuôn mặt — bắt đầu chuyến"
        : "Đăng ký khuôn mặt";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isLockedOrSubmitting}
        className={cn(
          "max-h-[90dvh] w-full max-w-[min(100%,28rem)] gap-3 p-4 sm:max-w-lg",
          phase === "locked" && "border-red-900/80 bg-red-950 text-red-50 ring-red-800/60",
        )}
        onPointerDownOutside={(e) => {
          if (isLockedOrSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isLockedOrSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(
              phase === "locked" && "text-lg font-black tracking-tight text-red-100",
            )}
          >
            {title}
          </DialogTitle>
          {phase !== "locked" ? (
            <DialogDescription className="text-left text-xs leading-relaxed text-muted-foreground">
              {statusLine || "Chuẩn bị…"}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {phase === "locked" ? (
          <div
            className={cn(
              "flex flex-col gap-4 rounded-xl border-4 border-red-800 bg-red-950 p-4 shadow-[inset_0_2px_24px_rgba(0,0,0,0.45)]",
              "sm:p-5",
            )}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className="mt-0.5 size-9 shrink-0 text-red-400"
                strokeWidth={2}
                aria-hidden
              />
              <p className="text-[13px] font-semibold leading-relaxed text-red-50 sm:text-sm">
                {lockMessage}
              </p>
            </div>
            <Button
              type="button"
              className="h-11 w-full border border-red-700/80 bg-red-900/90 font-semibold text-white hover:bg-red-800 active:bg-red-950"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
          </div>
        ) : (
          <>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                aria-hidden
              />
              {phase === "loading" || phase === "submitting" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                  {phase === "submitting" ? "Đang xử lý…" : "Đang khởi tạo…"}
                </div>
              ) : null}
            </div>

            {mode === "checkin" && phase === "scanning" ? (
              <p className="text-center text-[11px] font-medium text-amber-900/90 dark:text-amber-200/90">
                Sai khớp liên tiếp: {failedAttempts}/{MAX_MISMATCH_BEFORE_LOCK}
              </p>
            ) : null}

            <p className="text-center text-[11px] text-muted-foreground">
              Liên tiếp khớp: {streakUi}/{REQUIRED_STREAK} · Ngưỡng &lt; {FACE_MATCH_THRESHOLD}
            </p>
          </>
        )}

        {phase === "error" ? (
          <Button type="button" variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
