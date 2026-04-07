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

const createErrorExample = (
  summary: string,
  message: string,
  error: string,
  extra: Record<string, unknown> = {}
) => ({
  summary,
  value: {
    success: false,
    message,
    error,
    ...extra,
  },
});

const createErrorResponse = (
  description: string,
  summary: string,
  message: string,
  error: string,
  extra: Record<string, unknown> = {}
) => ({
  description,
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/ApiErrorResponse',
      },
      examples: {
        default: createErrorExample(summary, message, error, extra),
      },
    },
  },
});

const internalErrorResponse = createErrorResponse(
  'Loi he thong, backend tra ve INTERNAL_ERROR.',
  'Loi he thong',
  'Lỗi hệ thống, vui lòng thử lại sau',
  'INTERNAL_ERROR'
);

const swaggerServerUrl = `http://localhost:${process.env.PORT || '5000'}`;

const appendFailureCases = (description: string | undefined, failureCases: string[]) => {
  const normalizedDescription = description?.trim();
  const failureBlock = [
    'Case fail can test tren Swagger:',
    ...failureCases.map((item) => `- ${item}`),
  ].join('\n');

  return normalizedDescription
    ? `${normalizedDescription}\n\n${failureBlock}`
    : failureBlock;
};

type SwaggerParameterOverride = {
  in: string;
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
};

type SwaggerOperationOverride = {
  failureCases?: string[];
  parameters?: SwaggerParameterOverride[];
  responses?: Record<string, unknown>;
};

type SwaggerPathOverrides = Record<string, Record<string, SwaggerOperationOverride>>;

const mergeParameterOverrides = (operation: any, parameterOverrides: SwaggerParameterOverride[]) => {
  const currentParameters = Array.isArray(operation.parameters) ? [...operation.parameters] : [];

  for (const parameterOverride of parameterOverrides) {
    const existingIndex = currentParameters.findIndex((parameter) => (
      parameter?.in === parameterOverride.in && parameter?.name === parameterOverride.name
    ));

    if (existingIndex >= 0) {
      currentParameters[existingIndex] = {
        ...currentParameters[existingIndex],
        ...parameterOverride,
        schema: {
          ...(currentParameters[existingIndex]?.schema ?? {}),
          ...(parameterOverride.schema ?? {}),
        },
      };
      continue;
    }

    currentParameters.push(parameterOverride);
  }

  operation.parameters = currentParameters;
};

const applySwaggerOverrides = (spec: any) => {
  const pathOverrides: SwaggerPathOverrides = {
    '/api/auth/login': {
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_EMAIL',
          '401: WRONG_PASSWORD',
          '403: ACCOUNT_BLOCKED, AGENCY_INACTIVE',
          '404: ACCOUNT_NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu dau vao khong hop le: MISSING_FIELDS, INVALID_EMAIL.',
            'Thieu du lieu dang nhap',
            'Vui lòng nhập đầy đủ Email và Mật khẩu',
            'MISSING_FIELDS'
          ),
          '401': createErrorResponse(
            'Sai mat khau dang nhap: WRONG_PASSWORD.',
            'Sai mat khau',
            'Sai mật khẩu, vui lòng thử lại!',
            'WRONG_PASSWORD'
          ),
          '403': createErrorResponse(
            'Tai khoan bi khoa hoac dai ly khong con hoat dong: ACCOUNT_BLOCKED, AGENCY_INACTIVE.',
            'Tai khoan bi khoa',
            'Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin!',
            'ACCOUNT_BLOCKED'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai khoan dang nhap: ACCOUNT_NOT_FOUND.',
            'Tai khoan khong ton tai',
            'Tài khoản không tồn tại',
            'ACCOUNT_NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/auth/logout': {
      post: {
        failureCases: [
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '401': createErrorResponse(
            'Chua dang nhap, token khong hop le hoac token da bi blacklist.',
            'Token da dang xuat',
            'Token không hợp lệ hoặc đã đăng xuất',
            'TOKEN_BLACKLISTED'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/auth/change-password': {
      put: {
        failureCases: [
          '400: MISSING_FIELDS, WEAK_PASSWORD, PASSWORD_MISMATCH, SAME_PASSWORD',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED, WRONG_OLD_PASSWORD',
          '403: ACCOUNT_BLOCKED, AGENCY_INACTIVE',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu doi mat khau khong hop le: MISSING_FIELDS, WEAK_PASSWORD, PASSWORD_MISMATCH, SAME_PASSWORD.',
            'Mat khau moi yeu',
            'Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt như @, ! hoặc #',
            'WEAK_PASSWORD'
          ),
          '401': createErrorResponse(
            'Chua dang nhap hoac mat khau hien tai sai: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED, WRONG_OLD_PASSWORD.',
            'Sai mat khau hien tai',
            'Mật khẩu hiện tại không chính xác',
            'WRONG_OLD_PASSWORD'
          ),
          '403': createErrorResponse(
            'Tai khoan bi khoa hoac dai ly khong con hoat dong: ACCOUNT_BLOCKED, AGENCY_INACTIVE.',
            'Tai khoan bi khoa',
            'Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin!',
            'ACCOUNT_BLOCKED'
          ),
          '404': createErrorResponse(
            'Tai khoan dang doi mat khau khong con ton tai: NOT_FOUND.',
            'Tai khoan khong ton tai',
            'Tài khoản không tồn tại',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_EMAIL',
          '404: EMAIL_NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu quen mat khau khong hop le: MISSING_FIELDS, INVALID_EMAIL.',
            'Email sai dinh dang',
            'Email không đúng định dạng',
            'INVALID_EMAIL'
          ),
          '404': createErrorResponse(
            'Email khong ton tai trong he thong: EMAIL_NOT_FOUND.',
            'Khong tim thay email',
            'Email này không tồn tại trong hệ thống',
            'EMAIL_NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_EMAIL, INVALID_OTP_FORMAT, WEAK_PASSWORD, PASSWORD_MISMATCH, OTP_NOT_FOUND, INVALID_OTP, OTP_EXPIRED',
          '404: EMAIL_NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu dat lai mat khau khong hop le hoac OTP khong dung: MISSING_FIELDS, INVALID_EMAIL, INVALID_OTP_FORMAT, WEAK_PASSWORD, PASSWORD_MISMATCH, OTP_NOT_FOUND, INVALID_OTP, OTP_EXPIRED.',
            'OTP sai dinh dang',
            'Mã OTP không hợp lệ',
            'INVALID_OTP_FORMAT'
          ),
          '404': createErrorResponse(
            'Email khong ton tai trong he thong: EMAIL_NOT_FOUND.',
            'Email khong ton tai',
            'Email không tồn tại trong hệ thống',
            'EMAIL_NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/agencies': {
      get: {
        failureCases: [
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '401': createErrorResponse(
            'Can dang nhap de xem danh sach dai ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen API quan tri',
            'Không có quyền truy cập API quản trị',
            'FORBIDDEN'
          ),
          '500': internalErrorResponse,
        },
      },
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_CONTACT_PHONE',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '409: DUPLICATE_CODE, DUPLICATE_NAME',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu tao dai ly khong hop le: MISSING_FIELDS, INVALID_CONTACT_PHONE.',
            'So dien thoai khong hop le',
            'Số điện thoại đại lý không hợp lệ',
            'INVALID_CONTACT_PHONE'
          ),
          '401': createErrorResponse(
            'Can dang nhap de tao dai ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Chi Super Admin duoc tao dai ly: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '409': createErrorResponse(
            'Ma hoac ten dai ly da ton tai: DUPLICATE_CODE, DUPLICATE_NAME.',
            'Trung ma dai ly',
            'Ma dai ly da ton tai',
            'DUPLICATE_CODE'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/agencies/{id}': {
      put: {
        failureCases: [
          '400: INVALID_AGENCY_ID, EMPTY_UPDATE_PAYLOAD, INVALID_CONTACT_PHONE',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: DUPLICATE_CODE, DUPLICATE_NAME',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID hoac payload cap nhat khong hop le: INVALID_AGENCY_ID, EMPTY_UPDATE_PAYLOAD, INVALID_CONTACT_PHONE.',
            'Payload rong',
            'Không có dữ liệu để cập nhật đại lý',
            'EMPTY_UPDATE_PAYLOAD'
          ),
          '401': createErrorResponse(
            'Can dang nhap de cap nhat dai ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Chi Super Admin duoc sua dai ly: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay dai ly can sua: NOT_FOUND.',
            'Khong tim thay dai ly',
            'Khong tim thay dai ly',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Ma hoac ten dai ly da ton tai: DUPLICATE_CODE, DUPLICATE_NAME.',
            'Trung ten dai ly',
            'Ten dai ly da ton tai',
            'DUPLICATE_NAME'
          ),
          '500': internalErrorResponse,
        },
      },
      delete: {
        failureCases: [
          '400: INVALID_AGENCY_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: AGENCY_HAS_LINKED_DATA',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID dai ly khong hop le: INVALID_AGENCY_ID.',
            'ID dai ly sai dinh dang',
            'ID đại lý không hợp lệ',
            'INVALID_AGENCY_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xoa dai ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Chi Super Admin duoc xoa dai ly: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay dai ly can xoa: NOT_FOUND.',
            'Khong tim thay dai ly',
            'Khong tim thay dai ly',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Dai ly van con admin, tai xe hoac phuong tien lien ket: AGENCY_HAS_LINKED_DATA.',
            'Dai ly con du lieu lien ket',
            'Khong the xoa dai ly nay vi van con admin, tai xe hoac phuong tien lien ket',
            'AGENCY_HAS_LINKED_DATA'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/agency-accounts': {
      get: {
        failureCases: [
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '401': createErrorResponse(
            'Can dang nhap de xem danh sach tai khoan dai ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen API quan tri',
            'Không có quyền truy cập API quản trị',
            'FORBIDDEN'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/agency-accounts/agency/{id}': {
      post: {
        failureCases: [
          '400: INVALID_AGENCY_ID, MISSING_FIELDS, INVALID_EMAIL, INVALID_PASSWORD',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: AGENCY_NOT_FOUND',
          '409: AGENCY_INACTIVE, DUPLICATE_EMAIL',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu tao tai khoan khong hop le: INVALID_AGENCY_ID, MISSING_FIELDS, INVALID_EMAIL, INVALID_PASSWORD.',
            'Email khong hop le',
            'Email không hợp lệ',
            'INVALID_EMAIL'
          ),
          '401': createErrorResponse(
            'Can dang nhap de tao tai khoan quan ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Chi Super Admin duoc tao tai khoan quan ly: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay dai ly: AGENCY_NOT_FOUND.',
            'Khong tim thay dai ly',
            'Khong tim thay dai ly',
            'AGENCY_NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Dai ly tam ngung hoat dong hoac email da ton tai: AGENCY_INACTIVE, DUPLICATE_EMAIL.',
            'Email da ton tai',
            'Email da ton tai trong he thong',
            'DUPLICATE_EMAIL'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/agency-accounts/{id}': {
      delete: {
        failureCases: [
          '400: INVALID_ACCOUNT_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tai khoan dai ly khong hop le: INVALID_ACCOUNT_ID.',
            'ID tai khoan sai dinh dang',
            'ID tai khoan dai ly khong hop le',
            'INVALID_ACCOUNT_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xoa tai khoan dai ly.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Chi Super Admin duoc xoa tai khoan dai ly: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai khoan dai ly: NOT_FOUND.',
            'Khong tim thay tai khoan',
            'Khong tim thay tai khoan dai ly',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/drivers': {
      get: {
        failureCases: [
          '400: INVALID_PAGINATION, INVALID_AGENCY_ID, INVALID_STATUS',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Query list tai xe khong hop le: INVALID_PAGINATION, INVALID_AGENCY_ID, INVALID_STATUS.',
            'Trang thai tai xe sai',
            'Trạng thái tài xế không hợp lệ',
            'INVALID_STATUS'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xem danh sach tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen API quan tri',
            'Không có quyền truy cập API quản trị',
            'FORBIDDEN'
          ),
          '500': internalErrorResponse,
        },
      },
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_PHONE, INVALID_LICENSE_EXPIRY_DATE, PAST_LICENSE_EXPIRY_DATE, INVALID_STATUS, INVALID_AGENCY_ID, AGENCY_REQUIRED',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '404: AGENCY_NOT_FOUND',
          '409: AGENCY_INACTIVE, DUPLICATE_PHONE, DUPLICATE_LICENSE',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Payload tao tai xe khong hop le: MISSING_FIELDS, INVALID_PHONE, INVALID_LICENSE_EXPIRY_DATE, PAST_LICENSE_EXPIRY_DATE, INVALID_STATUS, INVALID_AGENCY_ID, AGENCY_REQUIRED.',
            'Can gan dai ly cho tai xe',
            'Can gan dai ly cho tai xe',
            'AGENCY_REQUIRED'
          ),
          '401': createErrorResponse(
            'Can dang nhap de tao tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '404': createErrorResponse(
            'Dai ly duoc gan cho tai xe khong ton tai: AGENCY_NOT_FOUND.',
            'Khong tim thay dai ly',
            'Khong tim thay dai ly',
            'AGENCY_NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Xung dot du lieu khi tao tai xe: AGENCY_INACTIVE, DUPLICATE_PHONE, DUPLICATE_LICENSE.',
            'Trung so dien thoai',
            'Số điện thoại này đã tồn tại trong hệ thống',
            'DUPLICATE_PHONE'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/drivers/{id}': {
      get: {
        failureCases: [
          '400: INVALID_DRIVER_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tai xe khong hop le: INVALID_DRIVER_ID.',
            'ID tai xe sai dinh dang',
            'ID tài xế không hợp lệ',
            'INVALID_DRIVER_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xem chi tiet tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager khong duoc xem tai xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Bạn không được phép xem tài xế của đại lý khác',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai xe can xem: NOT_FOUND.',
            'Khong tim thay tai xe',
            'Không tìm thấy tài xế',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
      put: {
        failureCases: [
          '400: INVALID_DRIVER_ID, EMPTY_UPDATE_PAYLOAD, INVALID_PHONE, INVALID_LICENSE_EXPIRY_DATE, PAST_LICENSE_EXPIRY_DATE, INVALID_STATUS, INVALID_AGENCY_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND, AGENCY_NOT_FOUND',
          '409: AGENCY_INACTIVE, DUPLICATE_PHONE, DUPLICATE_LICENSE',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID hoac payload cap nhat tai xe khong hop le: INVALID_DRIVER_ID, EMPTY_UPDATE_PAYLOAD, INVALID_PHONE, INVALID_LICENSE_EXPIRY_DATE, PAST_LICENSE_EXPIRY_DATE, INVALID_STATUS, INVALID_AGENCY_ID.',
            'Payload rong',
            'Không có dữ liệu để cập nhật',
            'EMPTY_UPDATE_PAYLOAD'
          ),
          '401': createErrorResponse(
            'Can dang nhap de cap nhat tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager khong duoc sua tai xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep sua tai xe cua dai ly khac',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai xe hoac dai ly can gan: NOT_FOUND, AGENCY_NOT_FOUND.',
            'Khong tim thay tai xe',
            'Không tìm thấy tài xế',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Xung dot du lieu khi cap nhat tai xe: AGENCY_INACTIVE, DUPLICATE_PHONE, DUPLICATE_LICENSE.',
            'Trung so bang lai',
            'Số bằng lái này đã tồn tại trong hệ thống',
            'DUPLICATE_LICENSE'
          ),
          '500': internalErrorResponse,
        },
      },
      delete: {
        failureCases: [
          '400: INVALID_DRIVER_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: DRIVER_ON_TRIP, DRIVER_HAS_LINKED_DATA',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tai xe khong hop le: INVALID_DRIVER_ID.',
            'ID tai xe sai dinh dang',
            'ID tài xế không hợp lệ',
            'INVALID_DRIVER_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xoa tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager khong duoc xoa tai xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep xoa tai xe cua dai ly khac',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai xe can xoa: NOT_FOUND.',
            'Khong tim thay tai xe',
            'Không tìm thấy tài xế',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Tai xe dang chay chuyen hoac dang co du lieu lien ket: DRIVER_ON_TRIP, DRIVER_HAS_LINKED_DATA.',
            'Tai xe dang trong chuyen di',
            'Khong the xoa tai xe dang trong chuyen di',
            'DRIVER_ON_TRIP'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/vehicles': {
      get: {
        failureCases: [
          '400: INVALID_PAGINATION, INVALID_AGENCY_ID, INVALID_STATUS',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '500: INTERNAL_ERROR',
        ],
        parameters: [
          {
            in: 'query',
            name: 'status',
            description: 'Loc theo trang thai xe',
            schema: {
              type: 'string',
              enum: ['available', 'on_trip', 'maintenance', 'retired'],
            },
          },
        ],
        responses: {
          '400': createErrorResponse(
            'Query list xe khong hop le: INVALID_PAGINATION, INVALID_AGENCY_ID, INVALID_STATUS.',
            'Trang thai xe sai',
            'Trạng thái xe khách không hợp lệ',
            'INVALID_STATUS'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xem danh sach xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen API quan tri',
            'Không có quyền truy cập API quản trị',
            'FORBIDDEN'
          ),
          '500': internalErrorResponse,
        },
      },
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_LICENSE_PLATE, INVALID_SEAT_COUNT, INVALID_REGISTRATION_EXPIRY_DATE, INVALID_INSURANCE_EXPIRY_DATE, INVALID_STATUS, INVALID_CAMERA_CODE, INVALID_AGENCY_ID, AGENCY_REQUIRED',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '404: AGENCY_NOT_FOUND',
          '409: AGENCY_INACTIVE, DUPLICATE_LICENSE_PLATE, DUPLICATE_CAMERA_CODE',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Payload tao xe khong hop le: MISSING_FIELDS, INVALID_LICENSE_PLATE, INVALID_SEAT_COUNT, INVALID_REGISTRATION_EXPIRY_DATE, INVALID_INSURANCE_EXPIRY_DATE, INVALID_STATUS, INVALID_CAMERA_CODE, INVALID_AGENCY_ID, AGENCY_REQUIRED.',
            'Bien so sai dinh dang',
            'Biển số xe không đúng định dạng Việt Nam',
            'INVALID_LICENSE_PLATE'
          ),
          '401': createErrorResponse(
            'Can dang nhap de tao xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '404': createErrorResponse(
            'Dai ly duoc gan cho xe khong ton tai: AGENCY_NOT_FOUND.',
            'Khong tim thay dai ly',
            'Khong tim thay dai ly',
            'AGENCY_NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Xung dot du lieu khi tao xe: AGENCY_INACTIVE, DUPLICATE_LICENSE_PLATE, DUPLICATE_CAMERA_CODE.',
            'Camera da gan cho xe khac',
            'Camera này đang được gắn trên xe khác, vui lòng gỡ liên kết trước',
            'DUPLICATE_CAMERA_CODE'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/vehicles/{id}': {
      get: {
        failureCases: [
          '400: INVALID_VEHICLE_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID xe khong hop le: INVALID_VEHICLE_ID.',
            'ID xe sai dinh dang',
            'ID xe khách không hợp lệ',
            'INVALID_VEHICLE_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xem chi tiet xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager khong duoc xem xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Bạn không được phép xem xe của đại lý khác',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay xe can xem: NOT_FOUND.',
            'Khong tim thay xe',
            'Không tìm thấy xe khách',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
      put: {
        failureCases: [
          '400: INVALID_VEHICLE_ID, EMPTY_UPDATE_PAYLOAD, INVALID_LICENSE_PLATE, INVALID_SEAT_COUNT, INVALID_REGISTRATION_EXPIRY_DATE, INVALID_INSURANCE_EXPIRY_DATE, INVALID_STATUS, INVALID_CAMERA_CODE, INVALID_AGENCY_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND, AGENCY_NOT_FOUND',
          '409: AGENCY_INACTIVE, DUPLICATE_LICENSE_PLATE, DUPLICATE_CAMERA_CODE',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID hoac payload cap nhat xe khong hop le: INVALID_VEHICLE_ID, EMPTY_UPDATE_PAYLOAD, INVALID_LICENSE_PLATE, INVALID_SEAT_COUNT, INVALID_REGISTRATION_EXPIRY_DATE, INVALID_INSURANCE_EXPIRY_DATE, INVALID_STATUS, INVALID_CAMERA_CODE, INVALID_AGENCY_ID.',
            'Payload rong',
            'Không có dữ liệu để cập nhật',
            'EMPTY_UPDATE_PAYLOAD'
          ),
          '401': createErrorResponse(
            'Can dang nhap de cap nhat xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager khong duoc sua xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep sua xe cua dai ly khac',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay xe hoac dai ly can gan: NOT_FOUND, AGENCY_NOT_FOUND.',
            'Khong tim thay xe',
            'Không tìm thấy xe khách',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Xung dot du lieu khi cap nhat xe: AGENCY_INACTIVE, DUPLICATE_LICENSE_PLATE, DUPLICATE_CAMERA_CODE.',
            'Camera da gan cho xe khac',
            'Camera này đang được gắn trên xe khác, vui lòng gỡ liên kết trước',
            'DUPLICATE_CAMERA_CODE'
          ),
          '500': internalErrorResponse,
        },
      },
      delete: {
        failureCases: [
          '400: INVALID_VEHICLE_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: VEHICLE_ON_TRIP, VEHICLE_HAS_LINKED_DATA',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID xe khong hop le: INVALID_VEHICLE_ID.',
            'ID xe sai dinh dang',
            'ID xe khách không hợp lệ',
            'INVALID_VEHICLE_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xoa xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager khong duoc xoa xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep xoa xe cua dai ly khac',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay xe can xoa: NOT_FOUND.',
            'Khong tim thay xe',
            'Không tìm thấy xe khách',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Xe dang trong chuyen di hoac dang co du lieu lien ket: VEHICLE_ON_TRIP, VEHICLE_HAS_LINKED_DATA.',
            'Xe dang co du lieu lien ket',
            'Khong the xoa xe nay vi da co du lieu lien ket',
            'VEHICLE_HAS_LINKED_DATA'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/routes': {
      get: {
        failureCases: [
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '401': createErrorResponse(
            'Can dang nhap de xem danh sach tuyen duong.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen API quan tri',
            'Không có quyền truy cập API quản trị',
            'FORBIDDEN'
          ),
          '500': internalErrorResponse,
        },
      },
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_DISTANCE, INVALID_DURATION, SAME_ORIGIN_DESTINATION',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '409: DUPLICATE_NAME',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu tao tuyen duong khong hop le: MISSING_FIELDS, INVALID_DISTANCE, INVALID_DURATION, SAME_ORIGIN_DESTINATION.',
            'Diem den trung diem di',
            'Diem den khong duoc trung voi diem xuat phat',
            'SAME_ORIGIN_DESTINATION'
          ),
          '401': createErrorResponse(
            'Can dang nhap de tao tuyen duong.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '409': createErrorResponse(
            'Ten tuyen duong da ton tai: DUPLICATE_NAME.',
            'Trung ten tuyen',
            'Ten tuyen duong da ton tai',
            'DUPLICATE_NAME'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/routes/{id}': {
      get: {
        failureCases: [
          '400: INVALID_ROUTE_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tuyen duong khong hop le: INVALID_ROUTE_ID.',
            'ID tuyen duong sai dinh dang',
            'ID tuyen duong khong hop le',
            'INVALID_ROUTE_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xem chi tiet tuyen duong.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tuyen duong: NOT_FOUND.',
            'Khong tim thay tuyen duong',
            'Khong tim thay tuyen duong',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
      put: {
        failureCases: [
          '400: INVALID_ROUTE_ID, EMPTY_UPDATE_PAYLOAD, INVALID_DISTANCE, INVALID_DURATION, SAME_ORIGIN_DESTINATION',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: DUPLICATE_NAME',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Du lieu cap nhat tuyen duong khong hop le: INVALID_ROUTE_ID, EMPTY_UPDATE_PAYLOAD, INVALID_DISTANCE, INVALID_DURATION, SAME_ORIGIN_DESTINATION.',
            'Payload rong',
            'Khong co du lieu de cap nhat tuyen duong',
            'EMPTY_UPDATE_PAYLOAD'
          ),
          '401': createErrorResponse(
            'Can dang nhap de cap nhat tuyen duong.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tuyen duong can cap nhat: NOT_FOUND.',
            'Khong tim thay tuyen duong',
            'Khong tim thay tuyen duong',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Ten tuyen duong da ton tai: DUPLICATE_NAME.',
            'Trung ten tuyen',
            'Ten tuyen duong da ton tai',
            'DUPLICATE_NAME'
          ),
          '500': internalErrorResponse,
        },
      },
      delete: {
        failureCases: [
          '400: INVALID_ROUTE_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: ROUTE_HAS_LINKED_DATA',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tuyen duong khong hop le: INVALID_ROUTE_ID.',
            'ID tuyen duong sai dinh dang',
            'ID tuyen duong khong hop le',
            'INVALID_ROUTE_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xoa tuyen duong.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen',
            'Không có quyền thực hiện thao tác này',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tuyen duong can xoa: NOT_FOUND.',
            'Khong tim thay tuyen duong',
            'Khong tim thay tuyen duong',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Tuyen duong dang co lich trinh hoat dong: ROUTE_HAS_LINKED_DATA.',
            'Tuyen duong co lich trinh',
            'Khong the xoa tuyen duong dang co lich trinh hoat dong',
            'ROUTE_HAS_LINKED_DATA'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/driver-accounts': {
      get: {
        failureCases: [
          '400: INVALID_PAGINATION, INVALID_AGENCY_ID, INVALID_IS_ACTIVE',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Query list tai khoan tai xe khong hop le: INVALID_PAGINATION, INVALID_AGENCY_ID, INVALID_IS_ACTIVE.',
            'Trang thai kich hoat sai',
            'is_active chi duoc la true hoac false',
            'INVALID_IS_ACTIVE'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xem danh sach tai khoan tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Tai khoan tai xe khong duoc phep truy cap API quan tri: FORBIDDEN.',
            'Khong du quyen API quan tri',
            'Không có quyền truy cập API quản trị',
            'FORBIDDEN'
          ),
          '500': internalErrorResponse,
        },
      },
      post: {
        failureCases: [
          '400: MISSING_FIELDS, INVALID_DRIVER_ID, INVALID_EMAIL',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: DRIVER_NOT_FOUND',
          '409: AGENCY_MANAGER_NOT_FOUND, ACCOUNT_ALREADY_EXISTS_FOR_DRIVER, DUPLICATE_EMAIL',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'Payload tao tai khoan tai xe khong hop le: MISSING_FIELDS, INVALID_DRIVER_ID, INVALID_EMAIL.',
            'Email sai dinh dang',
            'Email tai khoan tai xe khong dung dinh dang',
            'INVALID_EMAIL'
          ),
          '401': createErrorResponse(
            'Can dang nhap de tao tai khoan tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Agency Manager chi duoc tao tai khoan tai xe trong dai ly cua minh: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Agency Manager chi duoc tao tai khoan tai xe trong dai ly cua minh',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai xe can tao tai khoan: DRIVER_NOT_FOUND.',
            'Khong tim thay tai xe',
            'Khong tim thay tai xe',
            'DRIVER_NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Xung dot du lieu khi tao tai khoan tai xe: AGENCY_MANAGER_NOT_FOUND, ACCOUNT_ALREADY_EXISTS_FOR_DRIVER, DUPLICATE_EMAIL.',
            'Tai xe da co tai khoan',
            'Tai xe nay da co tai khoan dang nhap',
            'ACCOUNT_ALREADY_EXISTS_FOR_DRIVER'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/driver-accounts/{id}': {
      put: {
        failureCases: [
          '400: INVALID_DRIVER_ACCOUNT_ID, EMPTY_UPDATE_PAYLOAD, INVALID_EMAIL, INVALID_IS_ACTIVE',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '409: DUPLICATE_EMAIL',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID hoac payload cap nhat tai khoan tai xe khong hop le: INVALID_DRIVER_ACCOUNT_ID, EMPTY_UPDATE_PAYLOAD, INVALID_EMAIL, INVALID_IS_ACTIVE.',
            'Payload rong',
            'Khong co du lieu de cap nhat',
            'EMPTY_UPDATE_PAYLOAD'
          ),
          '401': createErrorResponse(
            'Can dang nhap de cap nhat tai khoan tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Khong duoc sua tai khoan tai xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep sua tai khoan tai xe cua dai ly khac',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai khoan tai xe can sua: NOT_FOUND.',
            'Khong tim thay tai khoan tai xe',
            'Khong tim thay tai khoan tai xe',
            'NOT_FOUND'
          ),
          '409': createErrorResponse(
            'Email tai khoan tai xe da ton tai: DUPLICATE_EMAIL.',
            'Trung email tai khoan',
            'Email tai khoan tai xe da ton tai',
            'DUPLICATE_EMAIL'
          ),
          '500': internalErrorResponse,
        },
      },
      delete: {
        failureCases: [
          '400: INVALID_DRIVER_ACCOUNT_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tai khoan tai xe khong hop le: INVALID_DRIVER_ACCOUNT_ID.',
            'ID tai khoan tai xe sai dinh dang',
            'ID tai khoan tai xe khong hop le',
            'INVALID_DRIVER_ACCOUNT_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de xoa tai khoan tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Khong duoc xoa tai khoan tai xe cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep xoa tai khoan tai xe cua dai ly khac',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai khoan tai xe can xoa: NOT_FOUND.',
            'Khong tim thay tai khoan tai xe',
            'Khong tim thay tai khoan tai xe',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
    '/api/driver-accounts/{id}/reset-password': {
      put: {
        failureCases: [
          '400: INVALID_DRIVER_ACCOUNT_ID',
          '401: UNAUTHORIZED, INVALID_TOKEN, TOKEN_BLACKLISTED',
          '403: FORBIDDEN',
          '404: NOT_FOUND',
          '500: INTERNAL_ERROR',
        ],
        responses: {
          '400': createErrorResponse(
            'ID tai khoan tai xe khong hop le: INVALID_DRIVER_ACCOUNT_ID.',
            'ID sai dinh dang',
            'ID tai khoan tai xe khong hop le',
            'INVALID_DRIVER_ACCOUNT_ID'
          ),
          '401': createErrorResponse(
            'Can dang nhap de reset mat khau tai khoan tai xe.',
            'Thieu token',
            'Không có token xác thực',
            'UNAUTHORIZED'
          ),
          '403': createErrorResponse(
            'Khong duoc reset mat khau tai khoan cua dai ly khac: FORBIDDEN.',
            'Khong du quyen theo agency',
            'Ban khong duoc phep reset mat khau tai khoan nay',
            'FORBIDDEN'
          ),
          '404': createErrorResponse(
            'Khong tim thay tai khoan tai xe can reset mat khau: NOT_FOUND.',
            'Khong tim thay tai khoan tai xe',
            'Khong tim thay tai khoan tai xe',
            'NOT_FOUND'
          ),
          '500': internalErrorResponse,
        },
      },
    },
  };

  for (const [path, methodOverrides] of Object.entries(pathOverrides)) {
    for (const [method, override] of Object.entries(methodOverrides)) {
      const operation = spec.paths?.[path]?.[method];
      if (!operation) {
        continue;
      }

      if (override.failureCases?.length) {
        operation.description = appendFailureCases(operation.description, override.failureCases);
      }

      if (override.parameters?.length) {
        mergeParameterOverrides(operation, override.parameters);
      }

      if (override.responses) {
        operation.responses = {
          ...(operation.responses ?? {}),
          ...override.responses,
        };
      }
    }
  }

  return spec;
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'SmartDrive API',
      version:     '1.0.0',
      description: 'API documentation cho he thong SmartDrive. Swagger UI khong tu dong chen token, hay bam Authorize va dung dung role can test cho tung API. Phan quyen nghiep vu Sprint 1: Super Admin -> Dai ly (Agency Manager) -> Tai xe. Hien tai cac module publish cho FE gom auth, agency, driver, driver-account va vehicle.',
    },
    servers: [
      { url: swaggerServerUrl, description: 'Development server' }
    ],
    tags: [
      { name: 'Auth', description: 'Dang nhap va quan ly xac thuc' },
      { name: 'Agencies', description: 'Quan ly cap dai ly / nha xe' },
      { name: 'AgencyAccounts', description: 'Quan ly tai khoan dai ly (agency_manager)' },
      { name: 'Drivers', description: 'Quan ly tai xe theo dai ly' },
      { name: 'DriverAccounts', description: 'US_04 - Quan ly danh sach tai khoan tai xe theo dai ly' },
      { name: 'Vehicles', description: 'Quan ly phuong tien theo dai ly' },
      { name: 'Routes', description: 'US_07 - Quan ly danh muc tuyen duong' },
      { name: 'Locations', description: 'Quan ly danh muc dia diem va tinh thanh' },
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
            data: {
              nullable: true,
              description: 'Du lieu bo sung cho mot so loi xung dot nghiep vu nhu on_trip hoac linked_data',
              example: null,
            },
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
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
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
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
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
            camera_code: { type: 'string', nullable: true, example: 'AI-CAM-001' },
            registration_expiry_date: { type: 'string', format: 'date', example: '2026-12-31' },
            insurance_expiry_date: { type: 'string', format: 'date', example: '2026-10-31' },
            status: { type: 'string', enum: ['available', 'on_trip', 'maintenance', 'retired'], example: 'available' },
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
            status: { type: 'string', enum: ['available', 'on_trip', 'maintenance', 'retired'], example: 'available' },
            camera_code: { type: 'string', nullable: true, example: 'AI-CAM-001' },
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
        RoutePayload: {
          type: 'object',
          required: ['name', 'origin', 'destination'],
          properties: {
            name: { type: 'string', example: 'Da Nang - Hue' },
            origin: { type: 'string', example: 'Da Nang' },
            destination: { type: 'string', example: 'Thua Thien Hue' },
            distance_km: { type: 'number', format: 'float', nullable: true, example: 100 },
            estimated_duration_min: { type: 'integer', nullable: true, example: 150, description: 'Thoi gian du kien (phut)' },
            is_active: { type: 'boolean', example: true, description: 'true = Dang khai thac, false = Tam ngung' },
          },
        },
        RouteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '55555555-5555-5555-5555-555555555555' },
            name: { type: 'string', example: 'Da Nang - Hue' },
            origin: { type: 'string', example: 'Da Nang' },
            destination: { type: 'string', example: 'Thua Thien Hue' },
            distance_km: { type: 'number', format: 'float', nullable: true, example: 100 },
            estimated_duration_min: { type: 'integer', nullable: true, example: 150 },
            is_active: { type: 'boolean', example: true },
            trip_count: { type: 'integer', example: 0 },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
          },
        },
        RouteDeleteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '55555555-5555-5555-5555-555555555555' },
            name: { type: 'string', example: 'Da Nang - Hue' },
            origin: { type: 'string', example: 'Da Nang' },
            destination: { type: 'string', example: 'Thua Thien Hue' },
          },
        },
        DriverAccountPayload: {
          type: 'object',
          required: ['driver_id', 'email'],
          properties: {
            driver_id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222', description: 'Lay id tu API danh sach tai xe. Swagger se de trong san truong nay de ban tu chon dung tai xe can tao tai khoan.' },
            email: { type: 'string', format: 'email', example: 'driver.nguyenvanan@smartdrive.vn', description: 'Email dang nhap cua tai xe, phai la duy nhat trong he thong. Mat khau se duoc he thong tu tao va gui qua email.' },
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
        AgencyAccountResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '88888888-8888-8888-8888-888888888888' },
            email: { type: 'string', format: 'email', example: 'manager@agency.com' },
            full_name: { type: 'string', example: 'Nha xe Da Nang' },
            role: { type: 'string', example: 'agency_manager' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            agency_name: { type: 'string', example: 'Nha xe Da Nang' },
            is_active: { type: 'boolean', example: true },
            created_by_admin_id: { type: 'string', format: 'uuid', nullable: true, example: '99999999-9999-9999-9999-999999999999' },
            created_by_admin_name: { type: 'string', nullable: true, example: 'Super Admin' },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:00:00.000Z' },
          },
        },
        AgencyAccountDeleteResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '88888888-8888-8888-8888-888888888888' },
            email: { type: 'string', format: 'email', example: 'manager@agency.com' },
            agency_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            agency_name: { type: 'string', example: 'Nha xe Da Nang' },
          },
        },
      }
    },
  },
  apis: [
    './src/apis/auth/auth.routes.ts',
    './src/apis/agencies/agency.routes.ts',
    './src/apis/agency-accounts/agencyAccount.routes.ts',
    './src/apis/drivers/driver.routes.ts',
    './src/apis/driver-accounts/driverAccount.routes.ts',
    './src/apis/vehicles/vehicle.routes.ts',
    './src/apis/routes/route.routes.ts',
    './src/apis/locations/location.routes.ts',
  ],
};

export const swaggerSpec = applySwaggerOverrides(sanitizeSwaggerNode(swaggerJsdoc(options)));