import swaggerJsdoc from 'swagger-jsdoc';

const isIdLikeField = (value: unknown): value is string => typeof value === 'string' && /(^id$|_id$)/i.test(value);

const shouldBlankExample = (
  node: Record<string, unknown>,
  parentKey?: string,
  parentNode?: Record<string, unknown>
): boolean => {
  if (isIdLikeField(parentKey)) {
    return true;
  }

  if (node.format === 'uuid') {
    return true;
  }

  if (isIdLikeField(node.name)) {
    return true;
  }

  if (parentNode && isIdLikeField(parentNode.name)) {
    return true;
  }

  return false;
};

const sanitizeSwaggerNode = <T>(value: T, parentKey?: string, parentNode?: Record<string, unknown>): T => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSwaggerNode(item, parentKey, parentNode)) as T;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue)
      .map(([key, childValue]) => {
        if ((key === 'example' || key === 'default') && shouldBlankExample(objectValue, parentKey, parentNode)) {
          return [key, ''];
        }

        return [key, sanitizeSwaggerNode(childValue, key, objectValue)];
      });

    return Object.fromEntries(entries) as T;
  }

  return value;
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'SmartDrive API',
      version:     '1.0.0',
      description: 'API documentation cho hệ thống SmartDrive. Phan quyen nghiep vu: Super Admin -> Dai ly (Agency Manager) -> Tai xe / Phuong tien. Hien tai cac module agency, driver va vehicle chi con luong tao, xem, sua va xoa truc tiep.',
    },
    servers: [
      { url: 'http://localhost:5001', description: 'Development server' }
    ],
    tags: [
      { name: 'Auth', description: 'Dang nhap va quan ly xac thuc' },
      { name: 'Agencies', description: 'Quan ly cap dai ly / nha xe' },
      { name: 'Drivers', description: 'Quan ly tai xe theo dai ly' },
      { name: 'Vehicles', description: 'Quan ly phuong tien theo dai ly' },
      { name: 'DriverAccounts', description: 'Quan ly tai khoan dang nhap cua tai xe' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        }
      },
      schemas: {
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 25 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Loi nghiep vu' },
            error: { type: 'string', example: 'BUSINESS_ERROR' },
          },
        },
        AgencyPayload: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string', example: 'DN_BUS', description: 'Ma dai ly duy nhat' },
            name: { type: 'string', example: 'Nha xe Da Nang', description: 'Ten dai ly / nha xe' },
            address: { type: 'string', example: '15 Hai Chau, Da Nang' },
            contact_phone: { type: 'string', example: '0905123456' },
          },
        },
        AgencyResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '11111111-1111-1111-1111-111111111111' },
            code: { type: 'string', example: 'DN_BUS' },
            name: { type: 'string', example: 'Nha xe Da Nang' },
            address: { type: 'string', example: '15 Hai Chau, Da Nang' },
            contact_phone: { type: 'string', example: '0905123456' },
            status: { type: 'string', enum: ['active'], example: 'active' },
            manager_count: { type: 'integer', example: 1 },
            driver_count: { type: 'integer', example: 5 },
            vehicle_count: { type: 'integer', example: 4 },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
          },
        },
        AgencyDeleteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            code: { type: 'string', example: 'DN_BUS' },
            name: { type: 'string', example: 'Nha xe Da Nang' },
            address: { type: 'string', nullable: true, example: '15 Hai Chau, Da Nang' },
            contact_phone: { type: 'string', nullable: true, example: '0905123456' },
            status: { type: 'string', enum: ['active'], example: 'active' },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:10:00.000Z' },
          },
        },
        DriverPayload: {
          type: 'object',
          required: ['full_name', 'phone', 'license_number', 'license_expiry_date', 'license_type'],
          properties: {
            full_name: { type: 'string', example: 'Nguyen Van A' },
            phone: { type: 'string', example: '0901234567' },
            license_number: { type: 'string', example: 'B2-123456' },
            license_expiry_date: { type: 'string', format: 'date', example: '2027-12-31' },
            license_type: { type: 'string', example: 'D' },
            face_image_url: { type: 'string', nullable: true, example: 'https://cdn.smartdrive.vn/driver-a.jpg' },
            status: { type: 'string', enum: ['active', 'on_trip', 'banned'], example: 'active' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111', description: 'Chi can khi Super Admin tao/sua cho mot dai ly cu the' },
          },
        },
        DriverResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222' },
            created_by_admin_id: { type: 'string', format: 'uuid', nullable: true, example: '99999999-9999-9999-9999-999999999999' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            agency_name: { type: 'string', example: 'Nha xe Da Nang' },
            full_name: { type: 'string', example: 'Nguyen Van A' },
            phone: { type: 'string', example: '0901234567' },
            license_number: { type: 'string', example: 'B2-123456' },
            license_expiry_date: { type: 'string', format: 'date', example: '2027-12-31' },
            license_type: { type: 'string', example: 'D' },
            face_image_url: { type: 'string', nullable: true, example: 'https://cdn.smartdrive.vn/driver-a.jpg' },
            safety_score: { type: 'number', format: 'float', example: 100 },
            safety_score_formula: { type: 'string', nullable: true, example: null },
            safety_score_updated_at: { type: 'string', format: 'date-time', nullable: true, example: null },
            status: { type: 'string', enum: ['active', 'on_trip', 'banned'], example: 'active' },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:05:00.000Z' },
          },
        },
        DriverDeleteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222' },
            full_name: { type: 'string', example: 'Nguyen Van A' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
          },
        },
        VehiclePayload: {
          type: 'object',
          required: ['license_plate', 'brand', 'model', 'seat_count', 'vehicle_type', 'registration_expiry_date', 'insurance_expiry_date'],
          properties: {
            license_plate: { type: 'string', example: '43B-123.45' },
            brand: { type: 'string', example: 'Thaco' },
            model: { type: 'string', example: 'Universe' },
            seat_count: { type: 'integer', example: 45 },
            vehicle_type: { type: 'string', example: 'ghe_ngoi' },
            registration_expiry_date: { type: 'string', format: 'date', example: '2026-12-31' },
            insurance_expiry_date: { type: 'string', format: 'date', example: '2026-10-31' },
            status: { type: 'string', enum: ['available', 'on_trip', 'maintenance'], example: 'available' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111', description: 'Chi can khi Super Admin tao/sua cho mot dai ly cu the' },
          },
        },
        VehicleResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '33333333-3333-3333-3333-333333333333' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            agency_name: { type: 'string', example: 'Nha xe Da Nang' },
            license_plate: { type: 'string', example: '43B-123.45' },
            brand: { type: 'string', example: 'Thaco' },
            model: { type: 'string', example: 'Universe' },
            seat_count: { type: 'integer', example: 45 },
            vehicle_type: { type: 'string', example: 'ghe_ngoi' },
            status: { type: 'string', enum: ['available', 'on_trip', 'maintenance'], example: 'available' },
            registration_expiry_date: { type: 'string', format: 'date', example: '2026-12-31' },
            insurance_expiry_date: { type: 'string', format: 'date', example: '2026-10-31' },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:05:00.000Z' },
          },
        },
        VehicleDeleteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '33333333-3333-3333-3333-333333333333' },
            license_plate: { type: 'string', example: '43B-123.45' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
          },
        },
        DriverAccountPayload: {
          type: 'object',
          required: ['driver_id', 'email', 'password', 'confirm_password'],
          properties: {
            driver_id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222', description: 'Lay id tu API danh sach tai xe. Swagger se de trong san truong nay de ban tu chon dung tai xe can tao tai khoan.' },
            email: { type: 'string', format: 'email', example: 'driver.nguyenvanan@smartdrive.vn', description: 'Email dang nhap cua tai xe, phai la duy nhat trong he thong.' },
            password: { type: 'string', example: 'Driver@123' },
            confirm_password: { type: 'string', example: 'Driver@123' },
          },
        },
        DriverAccountResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '44444444-4444-4444-4444-444444444444' },
            driver_id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222' },
            email: { type: 'string', format: 'email', example: 'driver.nguyenvanan@smartdrive.vn' },
            is_active: { type: 'boolean', example: true },
            must_change_password: { type: 'boolean', example: true },
            last_login_at: { type: 'string', format: 'date-time', nullable: true, example: null },
            created_by_admin_id: { type: 'string', format: 'uuid', example: '99999999-9999-9999-9999-999999999999' },
            created_by_admin_name: { type: 'string', nullable: true, example: 'Quan Ly Nha Xe Da Nang' },
            driver_full_name: { type: 'string', example: 'Nguyen Van An' },
            driver_phone: { type: 'string', example: '0901111001' },
            driver_status: { type: 'string', enum: ['active', 'on_trip', 'banned'], example: 'active' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            agency_name: { type: 'string', example: 'Nha xe Da Nang' },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-29T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-29T12:00:00.000Z' },
          },
        },
        DriverAccountDeleteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '44444444-4444-4444-4444-444444444444' },
            driver_id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222' },
            email: { type: 'string', format: 'email', example: 'driver.nguyenvanan@smartdrive.vn' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
          },
        },
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/apis/**/*.routes.ts'], // Quét tất cả file routes
};

export const swaggerSpec = sanitizeSwaggerNode(swaggerJsdoc(options));