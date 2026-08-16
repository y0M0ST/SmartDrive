import { Trip } from '../../entities/trip.entity';
import { TripStatus } from '../../common/constants/enums';
import { BadRequestException } from '../../common/errors/app-error';

/**
 * Vi phạm AI chỉ ghi nhận khi chuyến **IN_PROGRESS** và `occurred_at` nằm trong khoảng chuyến.
 *
 * - Chuyến **COMPLETED** / **CANCELLED**: từ chối ngay (xe đã về bến hoặc đã hủy).
 * - Bắt đầu: `actual_start_time` nếu có, không thì `departure_time`.
 * - Kết thúc (IN_PROGRESS): `actual_end_time` nếu có, không thì thời điểm ingest.
 *
 * `occurredAt` có thể là `Date` (TypeORM) hoặc chuỗi ISO từ JSON ingest.
 */
export function assertTripAcceptsViolationOccurredWindow(trip: Trip, occurredAt: Date | string): void {
    if (trip.status === TripStatus.COMPLETED) {
        throw new BadRequestException(
            'Chuyến đi đã hoàn thành — không ghi nhận vi phạm AI mới. Vui lòng kiểm tra trạng thái chuyến trên thiết bị.',
        );
    }

    if (trip.status === TripStatus.CANCELLED) {
        throw new BadRequestException(
            'Chuyến đi đã bị hủy — không ghi nhận vi phạm AI mới.',
        );
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException(
            `Chỉ ghi nhận vi phạm khi chuyến đang chạy (IN_PROGRESS). Trạng thái hiện tại: ${trip.status}.`,
        );
    }

    const violationAt = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
    const violationTime = violationAt.getTime();
    if (Number.isNaN(violationTime)) {
        throw new BadRequestException('occurred_at không hợp lệ (không parse được thành ngày giờ).');
    }

    const tripStart = trip.actual_start_time ?? trip.departure_time;
    const tripEnd = trip.actual_end_time ?? new Date();

    if (violationTime < tripStart.getTime() || violationTime > tripEnd.getTime()) {
        throw new BadRequestException(
            `occurred_at nằm ngoài khoảng chuyến hợp lệ (${tripStart.toISOString()} – ${tripEnd.toISOString()}).`,
        );
    }
}
