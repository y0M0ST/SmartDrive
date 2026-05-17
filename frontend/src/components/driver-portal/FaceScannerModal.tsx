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
  STABLE_LOOK_TICKS_REQUIRED,
  STABLE_LOOK_UI_HINT,
  STABLE_LOOK_UI_TITLE,
  detectFaceOnly,
  faceDistanceToMatchScore,
  getFaceDescriptor,
  isFaceBoxStableInOval,
  loadFaceModels,
  type FaceDescriptorSnapshot,
} from "@/lib/ai/faceAuth";
import { driverApi, unwrapFaceTemplate } from "@/services/driverApi";

/**
 * Máy yếu: interval quá ngắn → các lần detect chồng chéo, UI tắc. 300–350ms thường ổn định hơn 220ms.
 */
const SCAN_INTERVAL_MS = 500;
const FACE_ENCODING_DIM = 128;
/** Bước 2 (khớp mẫu): 3 khung liên tiếp đạt ngưỡng (US_18). */
const REQUIRED_STREAK = 3;
const MAX_MISMATCH_BEFORE_LOCK = 5;

/** Không hoàn thành bước 1 (nhìn thẳng ổn định) trong thời gian này → thoát / timeout. */
const LIVENESS_TIMEOUT_MS = 12_000;
/** Đồng bộ UI đếm ngược / toast với `LIVENESS_TIMEOUT_MS`. */
const LIVENESS_TIMEOUT_SEC = Math.ceil(LIVENESS_TIMEOUT_MS / 1000);

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

/** Bước 1: chỉ Tiny detect — không landmark. */
function drawFaceDetectionOnly(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detection: faceapi.WithFaceDetection<{}>,
  ok: boolean,
) {
  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  if (!displaySize.width || !displaySize.height) return;
  faceapi.matchDimensions(canvas, displaySize);
  const resized = faceapi.resizeResults(detection, displaySize);
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

  const livenessPassedRef = useRef(false);
  const stableLookStreakRef = useRef(0);
  const livenessStartedAtRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  const onOpenChangeRef = useRef(onOpenChange);
  onCompleteRef.current = onComplete;
  onOpenChangeRef.current = onOpenChange;

  const [phase, setPhase] = useState<Phase>("idle");
  const [statusLine, setStatusLine] = useState("");
  const [streakUi, setStreakUi] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockMessage, setLockMessage] = useState(LOCKED_UI_FALLBACK);

  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessRemainingSec, setLivenessRemainingSec] = useState(LIVENESS_TIMEOUT_SEC);
  /** Gợi ý dưới video khi bước 1: không thấy mặt / chưa đủ động tác / đang giữ chuỗi. */
  const [liveStep1Hint, setLiveStep1Hint] = useState<string>("");

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

    livenessPassedRef.current = false;
    stableLookStreakRef.current = 0;
    livenessStartedAtRef.current = 0;
    setLivenessPassed(false);
    setLivenessRemainingSec(LIVENESS_TIMEOUT_SEC);
    setLiveStep1Hint("");
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

    const triggerRegisterLivenessTimeout = () => {
      if (lockTriggeredRef.current || cancelled) return;
      stopInterval();
      toast.error(`Hết thời gian (${LIVENESS_TIMEOUT_SEC} giây) — chưa giữ mặt ổn định trong oval.`);
      cleanupCapture();
      setPhase("error");
      setStatusLine("Hết thời gian — chưa giữ mặt ổn định trong oval.");
    };

    /** Hết giờ liveness: không khóa tài khoản — chỉ báo lỗi (khác với 5 lần sai khớp khuôn). */
    const triggerCheckinLivenessTimeout = () => {
      if (lockTriggeredRef.current || cancelled) return;
      stopInterval();
      toast.error(
        `Hết thời gian (${LIVENESS_TIMEOUT_SEC} giây). Thử lại: nhìn thẳng, căn mặt trong oval. Tài khoản không bị khóa.`,
        { duration: 8000 },
      );
      cleanupCapture();
      setPhase("error");
      setStatusLine("Hết thời gian — mở lại và giữ mặt ổn định trong khung oval.");
      onCompleteRef.current();
    };

    const tick = async () => {
      if (cancelled || lockTriggeredRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      if (!livenessPassedRef.current) {
        const elapsed = Date.now() - livenessStartedAtRef.current;
        setLivenessRemainingSec(Math.max(0, Math.ceil((LIVENESS_TIMEOUT_MS - elapsed) / 1000)));
        if (elapsed >= LIVENESS_TIMEOUT_MS) {
          if (mode === "checkin") {
            triggerCheckinLivenessTimeout();
          } else {
            triggerRegisterLivenessTimeout();
          }
          return;
        }
      }

      if (!livenessPassedRef.current) {
        const det = await detectFaceOnly(video);
        if (!det) {
          stableLookStreakRef.current = 0;
          streakRef.current = 0;
          setStreakUi(0);
          setLiveStep1Hint(
            "Chưa thấy khuôn mặt rõ — đưa mặt vào giữa oval, đủ sáng, không đeo khẩu trang.",
          );
          if (mode === "register") anchorRef.current = null;
          clearCanvas();
          return;
        }

        const inOval = isFaceBoxStableInOval(det.detection.box, video.videoWidth, video.videoHeight);
        drawFaceDetectionOnly(canvas, video, det, inOval);
        if (inOval) {
          stableLookStreakRef.current += 1;
          const st = stableLookStreakRef.current;
          if (st >= STABLE_LOOK_TICKS_REQUIRED) {
            livenessPassedRef.current = true;
            setLivenessPassed(true);
            streakRef.current = 0;
            setStreakUi(0);
            stableLookStreakRef.current = 0;
            setLiveStep1Hint("");
          } else {
            setLiveStep1Hint(`Giữ yên · ổn định ${st}/${STABLE_LOOK_TICKS_REQUIRED} khung (khung xanh).`);
          }
        } else {
          stableLookStreakRef.current = 0;
          setLiveStep1Hint("Khung đỏ: căn mặt vào giữa oval, nhìn thẳng camera.");
        }
        if (!livenessPassedRef.current) return;
      }

      const snap = await getFaceDescriptor(video);
      if (!snap) {
        streakRef.current = 0;
        setStreakUi(0);
        setLiveStep1Hint("Đang lấy đặc trưng khuôn mặt — giữ mặt trong oval, đủ sáng.");
        if (mode === "register") anchorRef.current = null;
        clearCanvas();
        return;
      }

      if (mode === "checkin") {
        const template = templateRef.current;
        if (!template || template.length !== FACE_ENCODING_DIM) {
          // eslint-disable-next-line no-console
          console.error("[Face ID] Thiếu hoặc sai kích thước mẫu gốc — không so khớp được.");
          return;
        }
        const live = snap.descriptor;
        if (live.length !== FACE_ENCODING_DIM) {
          // eslint-disable-next-line no-console
          console.error("[Face ID] Descriptor live không đủ 128 chiều.");
          return;
        }
        /** Luôn so live với mẫu đã fetch từ DB (`template`), không dùng anchor đăng ký. */
        const distance = faceapi.euclideanDistance(template, live);
        const score = faceDistanceToMatchScore(distance);
        bestMatchScoreRef.current = Math.max(bestMatchScoreRef.current, score);

        const ok = distance < FACE_MATCH_THRESHOLD;
        // eslint-disable-next-line no-console
        console.log("[Face ID] Distance:", distance, "· ngưỡng <", FACE_MATCH_THRESHOLD, "· khớp UI:", ok);
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
            const faceEncoding = Array.from(live);
            try {
              await driverApi.checkinTrip(tripId!, { result: "SUCCESS", matchScore, faceEncoding });
              toast.success("Điểm danh thành công. Chuyến đi đã chuyển sang đang chạy.");
              cleanupCapture();
              onCompleteRef.current();
              onOpenChangeRef.current(false);
            } catch (e: unknown) {
              const ax = e as { response?: { data?: { message?: string; errorCode?: string } } };
              const msg =
                typeof ax.response?.data?.message === "string" && ax.response.data.message.trim() !== ""
                  ? ax.response.data.message
                  : "Gửi điểm danh thất bại. Thử lại.";
              toast.error(msg, { duration: 8000 });
              streakRef.current = 0;
              setStreakUi(0);
              setPhase("scanning");
              setStatusLine(
                ax.response?.data?.errorCode === "FACE_MISMATCH"
                  ? "Máy chủ từ chối: khuôn mặt không khớp mẫu đã đăng ký."
                  : "Lỗi khi gửi máy chủ. Tiếp tục quét…",
              );
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
            const enc = parsed.faceEncoding;
            if (enc.length !== FACE_ENCODING_DIM) {
              setPhase("error");
              setStatusLine("Mẫu khuôn mặt trên máy chủ không đúng định dạng (128).");
              return;
            }
            templateRef.current = new Float32Array(enc);
            // eslint-disable-next-line no-console
            console.log("[Face ID] Đã tải mẫu gốc từ DB (anchor), dim:", enc.length);
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

        livenessPassedRef.current = false;
        stableLookStreakRef.current = 0;
        livenessStartedAtRef.current = Date.now();
        setLivenessPassed(false);
        setLivenessRemainingSec(LIVENESS_TIMEOUT_SEC);

        setPhase("scanning");
        setStatusLine(
          mode === "checkin"
            ? "Bước 1: nhìn thẳng, giữ mặt ổn định trong oval. Bước 2: khớp khuôn mặt để điểm danh."
            : "Bước 1: nhìn thẳng trong oval. Bước 2: giữ mặt để đăng ký mẫu.",
        );
        setLiveStep1Hint(STABLE_LOOK_UI_HINT);
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
                className="relative z-0 h-full w-full -scale-x-100 object-cover transform"
                muted
                playsInline
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 z-10 h-full w-full -scale-x-100 transform object-cover"
                aria-hidden
              />
              {/* eKYC: làm tối vùng ngoài oval — lỗ trong suốt để thấy video + khung xanh canvas */}
              {phase === "scanning" ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center overflow-hidden"
                    aria-hidden
                  >
                    <div
                      className="rounded-[50%] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.62)]"
                      style={{
                        width: "min(54%, 13.5rem)",
                        aspectRatio: "3 / 4",
                        maxHeight: "78%",
                      }}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 z-[13] flex items-center justify-center">
                    <div
                      className="rounded-[50%] border-[2.5px] border-dashed border-emerald-400/95 shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_22px_rgba(16,185,129,0.35)]"
                      style={{
                        width: "min(54%, 13.5rem)",
                        aspectRatio: "3 / 4",
                        maxHeight: "78%",
                      }}
                      aria-hidden
                    />
                  </div>
                  <p
                    className="pointer-events-none absolute bottom-2.5 left-0 right-0 z-20 text-center text-[10px] font-semibold tracking-wide text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                    style={{ textShadow: "0 0 8px rgba(0,0,0,0.6)" }}
                  >
                    Căn mặt trong khung oval — nhìn thẳng camera
                  </p>
                </>
              ) : null}
              {phase === "scanning" ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-2">
                  <div className="rounded-lg bg-amber-500 px-3 py-2 text-center shadow-lg ring-1 ring-amber-600/30">
                    <p className="text-[13px] font-black uppercase tracking-wide text-amber-950">
                      {STABLE_LOOK_UI_TITLE}
                    </p>
                    {!livenessPassed ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-900">
                        Bước 1 — Ổn định trong oval ({STABLE_LOOK_TICKS_REQUIRED} khung) · còn{" "}
                        {livenessRemainingSec}s
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] font-semibold text-amber-900">
                        {`Bước 2 — Khớp khuôn mặt (Euclidean < ${FACE_MATCH_THRESHOLD}${
                          REQUIRED_STREAK > 1 ? ` · ${REQUIRED_STREAK} khung liên tiếp` : " · một khung duy nhất"
                        })`}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              {phase === "loading" || phase === "submitting" ? (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                  {phase === "submitting" ? "Đang xử lý…" : "Đang khởi tạo…"}
                </div>
              ) : null}
            </div>

            {mode === "checkin" && phase === "scanning" && livenessPassed ? (
              <p className="text-center text-[11px] font-medium text-amber-900/90 dark:text-amber-200/90">
                Sai khớp khuôn mặt liên tiếp: {failedAttempts}/{MAX_MISMATCH_BEFORE_LOCK}
              </p>
            ) : null}

            {phase === "scanning" && livenessPassed ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Khớp mặt: {streakUi}/{Math.max(REQUIRED_STREAK, 1)} · Ngưỡng &lt; {FACE_MATCH_THRESHOLD}
              </p>
            ) : phase === "scanning" && !livenessPassed ? (
              <p className="text-center text-[11px] leading-snug text-muted-foreground">
                {liveStep1Hint || STABLE_LOOK_UI_HINT}
              </p>
            ) : null}
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
