export enum UserStatus {
    ACTIVE = 'ACTIVE',
    BLOCKED = 'BLOCKED',
    INACTIVE = 'INACTIVE',
}

export enum VehicleType {
    SLEEPER = 'SLEEPER',
    SEAT = 'SEAT',
}

export enum VehicleStatus {
    AVAILABLE = 'AVAILABLE',
    IN_SERVICE = 'IN_SERVICE',
    MAINTENANCE = 'MAINTENANCE',
    INACTIVE = 'INACTIVE',
}

export enum TripStatus {
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum RouteStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
}

export enum ViolationType {
    DROWSY = 'DROWSY',
    DISTRACTED = 'DISTRACTED',
}

export enum CheckinResult {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    LOCKED = 'LOCKED',
}