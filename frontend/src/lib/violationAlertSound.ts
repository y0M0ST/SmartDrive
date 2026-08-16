/** US_10 — thử phát file tĩnh; bắt lỗi theo chính sách Autoplay của trình duyệt. */
export function playViolationAlertSound(): void {
  const audio = new Audio("/alarm.mp3");
  void audio.play().catch(() => {
    console.log("Chưa tương tác");
  });
}
