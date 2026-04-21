import 'socket.io';

declare module 'socket.io' {
    interface SocketData {
        /** JWT sub / user id */
        userId: string;
        /** Scope phòng agency — bắt buộc cho US_09 */
        agencyId: string;
        role: string;
    }
}
