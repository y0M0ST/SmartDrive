import * as faceapi from "face-api.js";

const MODEL_URI = "/models";

/**
 * TinyFaceDetector: nhẹ hơn SSD MobileNet rất nhiều — phù hợp máy yếu / FPS thấp.
 * `inputSize` nhỏ → nhanh; `scoreThreshold` thấp → dễ bắt mặt trong điều kiện khó.
 */
const TINY_INPUT_SIZE = 128;
const TINY_SCORE_THRESHOLD = 0.35;

export const TINY_FACE_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: TINY_INPUT_SIZE,
  scoreThreshold: TINY_SCORE_THRESHOLD,
});

let modelsLoaded = false;

/** Bật log thời gian từng bước: `localStorage.setItem('DEBUG_FACE_PERF','1')` rồi F5. */
export function logFacePerformance(timings: FrameTimings): void {
  if (typeof localStorage === "undefined" || localStorage.getItem("DEBUG_FACE_PERF") !== "1") {
    return;
  }
  // eslint-disable-next-line no-console
  console.debug("[face-perf]", timings);
}

export type FrameTimings = {
  label: string;
  detectMs?: number;
  fullPipelineMs?: number;
};

/**
 * Tải TinyFaceDetector + landmark 68 + recognition (SSD không còn dùng).
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
  ]);
  modelsLoaded = true;
}

export type FaceDescriptorSnapshot = {
  descriptor: Float32Array;
  faceApiResult: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>;
};

/**
 * Chỉ detect hộp mặt (Tiny) — không chạy landmark/descriptor. Dùng cho bước 1 (ổn định trong oval).
 */
export async function detectFaceOnly(
  video: HTMLVideoElement,
): Promise<faceapi.WithFaceDetection<{}> | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const t0 = performance.now();
  const raw = await faceapi.detectSingleFace(video, TINY_FACE_OPTIONS);
  const t1 = performance.now();
  logFacePerformance({ label: "tiny_detect", detectMs: Math.round((t1 - t0) * 100) / 100 });
  if (!raw) return null;
  /** Một số bản typings coi kết quả là `FaceDetection` thay vì `WithFaceDetection`. */
  if (typeof raw === "object" && raw !== null && "detection" in raw) {
    return raw as faceapi.WithFaceDetection<{}>;
  }
  return { detection: raw as faceapi.FaceDetection };
}

/**
 * Pipeline đầy đủ: Tiny → landmark 68 → descriptor 128 chiều.
 */
export async function getFaceDescriptor(
  video: HTMLVideoElement,
): Promise<FaceDescriptorSnapshot | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const t0 = performance.now();
  const result = await faceapi
    .detectSingleFace(video, TINY_FACE_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  const t1 = performance.now();
  logFacePerformance({
    label: "tiny_landmarks_descriptor",
    fullPipelineMs: Math.round((t1 - t0) * 100) / 100,
  });
  if (!result) return null;
  return { descriptor: result.descriptor, faceApiResult: result };
}

/**
 * Ngưỡng Euclidean descriptor (face-api): càng **nhỏ** càng khắt — giảm FAR (nhận nhầm người giống nhau).
 * Khớp khi `distance < FACE_MATCH_THRESHOLD`. Đồng bộ với backend `FACE_MATCH_DISTANCE_THRESHOLD`.
 */
export const FACE_MATCH_THRESHOLD = 0.45;

export function faceDistanceToMatchScore(distance: number): number {
  const d = Math.min(Math.max(distance, 0), 1);
  return Math.round((1 - d) * 1000) / 10;
}

/** Chiến lược demo: bỏ há miệng/quay đầu — chỉ cần mặt ổn định trong oval. */
export const FACE_LIVENESS_STRATEGY = "stable_look" as const;

/** Số tick quét liên tiếp “ổn định” để coi như pass bước 1 (~320ms × 4 ≈ 1.3s). */
export const STABLE_LOOK_TICKS_REQUIRED = 4;

export const STABLE_LOOK_UI_TITLE = "Nhìn thẳng camera";
export const STABLE_LOOK_UI_HINT =
  "Giữ mặt trong khung oval ổn định. Hệ thống quét nhẹ (demo — liveness chặt sẽ xử lý sau).";

/** Vùng ellipse chuẩn hoá (0–1) khớp overlay oval ~54%×(3/4) giữa khung. */
const OVAL_CENTER_X = 0.5;
const OVAL_CENTER_Y = 0.5;
const OVAL_RADIUS_X = 0.26;
const OVAL_RADIUS_Y = 0.36;

/** Kích thước hộp mặt tối thiểu / tối đa so với khung video (tránh nhiễu / quá gần). */
const MIN_BOX_WIDTH_FRAC = 0.08;
const MAX_BOX_WIDTH_FRAC = 0.72;

/**
 * Kiểm tra mặt nằm gọn trong vùng oval (theo tọa độ video gốc) và đủ lớn.
 */
export function isFaceBoxStableInOval(box: faceapi.Box, videoWidth: number, videoHeight: number): boolean {
  if (videoWidth < 2 || videoHeight < 2) return false;
  const nw = box.width / videoWidth;
  if (nw < MIN_BOX_WIDTH_FRAC || nw > MAX_BOX_WIDTH_FRAC) return false;

  const cx = (box.x + box.width / 2) / videoWidth;
  const cy = (box.y + box.height / 2) / videoHeight;
  const dx = (cx - OVAL_CENTER_X) / OVAL_RADIUS_X;
  const dy = (cy - OVAL_CENTER_Y) / OVAL_RADIUS_Y;
  return dx * dx + dy * dy <= 1;
}

/* ─── Legacy: thử thách landmark (không dùng khi FACE_LIVENESS_STRATEGY = stable_look) ─── */

export type LivenessChallenge = "OPEN_MOUTH" | "TURN_LEFT" | "TURN_RIGHT";

const CHALLENGES: LivenessChallenge[] = ["OPEN_MOUTH", "TURN_LEFT", "TURN_RIGHT"];

export function pickRandomLivenessChallenge(): LivenessChallenge {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]!;
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const MOUTH_OPEN_MAR_MIN = 0.1;
const YAW_SHIFT_LEFT_MAX = -0.03;
const YAW_SHIFT_RIGHT_MIN = 0.03;
const CHEEK_LEFT_MAX = 0.985;
const CHEEK_RIGHT_MIN = 1.015;

export function get68LandmarkPositions(
  faceApiResult: FaceDescriptorSnapshot["faceApiResult"],
): { x: number; y: number }[] | null {
  const lm = faceApiResult.landmarks as {
    positions?: { x: number; y: number }[];
    getPositions?: () => { x: number; y: number }[];
  };
  let p = lm?.positions;
  if (!Array.isArray(p) || p.length < 68) {
    p = typeof lm?.getPositions === "function" ? lm.getPositions() : undefined;
  }
  if (Array.isArray(p) && p.length >= 68) return p;
  return null;
}

function yawNoseVsJaw(positions: { x: number; y: number }[]): number {
  const jawW = Math.abs(positions[16]!.x - positions[0]!.x);
  if (jawW < 1e-6) return 0;
  const centerX = (positions[0]!.x + positions[16]!.x) / 2;
  return (positions[30]!.x - centerX) / jawW;
}

function yawNoseVsEyes(positions: { x: number; y: number }[]): number {
  const xl = positions[36]!.x;
  const xr = positions[45]!.x;
  const span = Math.abs(xr - xl);
  if (span < 1e-6) return 0;
  const mid = (xl + xr) / 2;
  return (positions[30]!.x - mid) / span;
}

function cheekAsymmetryRatio(positions: { x: number; y: number }[]): number {
  const nl = dist2(positions[30]!, positions[2]!);
  const nr = dist2(positions[30]!, positions[14]!);
  return nr > 1e-6 ? nl / (nr + 1e-6) : 1;
}

function passesTurnLeft(yawJaw: number, yawEye: number, cheekRatio: number): boolean {
  return (
    yawJaw <= YAW_SHIFT_LEFT_MAX ||
    yawEye <= YAW_SHIFT_LEFT_MAX ||
    cheekRatio <= CHEEK_LEFT_MAX
  );
}

function passesTurnRight(yawJaw: number, yawEye: number, cheekRatio: number): boolean {
  return (
    yawJaw >= YAW_SHIFT_RIGHT_MIN ||
    yawEye >= YAW_SHIFT_RIGHT_MIN ||
    cheekRatio >= CHEEK_RIGHT_MIN
  );
}

export function evaluateLivenessChallenge(
  positions: { x: number; y: number }[],
  challenge: LivenessChallenge,
): boolean {
  if (!positions || positions.length < 68) return false;

  const jawW = Math.abs(positions[16]!.x - positions[0]!.x);
  if (jawW < 4) return false;

  const yawJaw = yawNoseVsJaw(positions);
  const yawEye = yawNoseVsEyes(positions);
  const cheekRatio = cheekAsymmetryRatio(positions);

  switch (challenge) {
    case "OPEN_MOUTH": {
      const mar =
        dist2(positions[62]!, positions[66]!) /
        Math.max(dist2(positions[60]!, positions[64]!), 1e-6);
      return mar >= MOUTH_OPEN_MAR_MIN;
    }
    case "TURN_LEFT":
      return passesTurnRight(yawJaw, yawEye, cheekRatio);
    case "TURN_RIGHT":
      return passesTurnLeft(yawJaw, yawEye, cheekRatio);
    default:
      return false;
  }
}

export function logLivenessDebug(
  challenge: LivenessChallenge,
  positions: { x: number; y: number }[],
): void {
  if (typeof localStorage === "undefined" || localStorage.getItem("DEBUG_FACE_LIVENESS") !== "1") {
    return;
  }
  const yj = yawNoseVsJaw(positions);
  const ye = yawNoseVsEyes(positions);
  const cr = cheekAsymmetryRatio(positions);
  // eslint-disable-next-line no-console
  console.debug("[liveness]", challenge, {
    yawJaw: yj.toFixed(3),
    yawEye: ye.toFixed(3),
    cheekRatio: cr.toFixed(3),
  });
}

export const LIVENESS_CHALLENGE_LABEL: Record<LivenessChallenge, string> = {
  OPEN_MOUTH: "Hé miệng nhẹ (demo)",
  TURN_LEFT: "Nghiêng đầu nhẹ sang trái (demo)",
  TURN_RIGHT: "Nghiêng đầu nhẹ sang phải (demo)",
};
