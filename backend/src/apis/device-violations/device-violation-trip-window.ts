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
 */
export function assertTripAcceptsViolationOccurredWindow(trip: Trip, occurredAt: Date): void {
    if (trip.status !== TripStatus.IN_PROGRESS && trip.status !== TripStatus.COMPLETED) {
        throw new BadRequestException(
            `Chỉ ghi nhận vi phạm khi chuyến IN_PROGRESS hoặc COMPLETED (hiện tại: ${trip.status}).`,
        );
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

    if (occurredAt.getTime() < tripStart.getTime() || occurredAt.getTime() > tripEnd.getTime()) {
        throw new BadRequestException(
            `occurred_at nằm ngoài khoảng chuyến hợp lệ (${tripStart.toISOString()} – ${tripEnd.toISOString()}).`,
        );
    }
}
