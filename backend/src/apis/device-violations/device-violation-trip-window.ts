import { Trip } from '../../entities/trip.entity';
import { TripStatus } from '../../common/constants/enums';
import { BadRequestException } from '../../common/errors/app-error';

/**
 * Vi phạm gửi trễ: chấp nhận khi chuyến IN_PROGRESS hoặc COMPLETED
 * và `occurred_at` nằm trong [bắt đầu chuyến, kết thúc chuyến].
 *
 * - Bắt đầu: `actual_start_time` nếu có, không thì `departure_time`.
 * - Kết thúc: `actual_end_time` nếu có; nếu chuyến vẫn IN_PROGRESS thì dùng thời điểm ingest (mở nửa khoảng cuối);
 *   COMPLETED mà thiếu `actual_end_time` → `planned_end_time`.
 *
 * `occurredAt` có thể là `Date` (TypeORM) hoặc chuỗi ISO từ JSON ingest — luôn ép về `Date` trước khi so sánh.
 */
export function assertTripAcceptsViolationOccurredWindow(trip: Trip, occurredAt: Date | string): void {
    if (trip.status !== TripStatus.IN_PROGRESS && trip.status !== TripStatus.COMPLETED) {
        throw new BadRequestException(
            `Chỉ ghi nhận vi phạm khi chuyến IN_PROGRESS hoặc COMPLETED (hiện tại: ${trip.status}).`,
        );
    }

    const violationAt = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
    const violationTime = violationAt.getTime();
    if (Number.isNaN(violationTime)) {
        throw new BadRequestException('occurred_at không hợp lệ (không parse được thành ngày giờ).');
    }

    const tripStart = trip.actual_start_time ?? trip.departure_time;
    let tripEnd: Date;
    if (trip.actual_end_time) {
        tripEnd = trip.actual_end_time;
    } else if (trip.status === TripStatus.IN_PROGRESS) {
        tripEnd = new Date();
    } else {
        tripEnd = trip.planned_end_time;
    }

    if (violationTime < tripStart.getTime() || violationTime > tripEnd.getTime()) {
        throw new BadRequestException(
            `occurred_at nằm ngoài khoảng chuyến hợp lệ (${tripStart.toISOString()} – ${tripEnd.toISOString()}).`,
        );
    }
}
