import * as faceapi from "face-api.js";

const MODEL_URI = "/models";

const SSD_OPTIONS = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

let modelsLoaded = false;

/**
 * Tải 3 model SSD + landmark + recognition từ `public/models` (Vite → `/models`).
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URI),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
  ]);
  modelsLoaded = true;
}

export type FaceDescriptorSnapshot = {
  /** Vector 128 chiều (face-api.js). */
  descriptor: Float32Array;
  /** Kết quả đầy đủ để `faceapi.resizeResults` + vẽ khung trùng tỉ lệ video. */
  faceApiResult: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>;
};

/**
 * Trích xuất descriptor khuôn mặt từ khung hình video hiện tại (một người).
 * Trả về `null` nếu không thấy mặt hoặc video chưa sẵn sàng.
 */
export async function getFaceDescriptor(
  video: HTMLVideoElement,
): Promise<FaceDescriptorSnapshot | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const result = await faceapi
    .detectSingleFace(video, SSD_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return { descriptor: result.descriptor, faceApiResult: result };
}

/** Ngưỡng nhận diện (càng nhỏ càng “khắt”). */
export const FACE_MATCH_THRESHOLD = 0.45;

export function faceDistanceToMatchScore(distance: number): number {
  const d = Math.min(Math.max(distance, 0), 1);
  return Math.round((1 - d) * 1000) / 10;
}
