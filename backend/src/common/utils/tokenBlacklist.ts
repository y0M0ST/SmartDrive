// Lưu token đã logout vào Set (in-memory)
// Khi restart server, blacklist sẽ bị xóa — chấp nhận được cho đồ án
const blacklist = new Set<string>();

export const addToBlacklist = (token: string): void => {
  blacklist.add(token);
};

export const isBlacklisted = (token: string): boolean => {
  return blacklist.has(token);
};