"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const province_dto_1 = require("./province.dto");
const province_controller_1 = require("./province.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   - name: Provinces
 *     description: Danh muc tinh thanh Viet Nam (hardcoded, khong database)
 */
/**
 * @swagger
 * /api/provinces:
 *   get:
 *     summary: Lay danh sach 34 tinh thanh (sau sap nhap 2025)
 *     description: |
 *       API public, khong can Bearer token.
 *       Du lieu lay tu hang so `VIETNAM_PROVINCES` tren server (khong doc database).
 *       Dung cho form chon diem di / diem den (autocomplete) khi tao tuyen duong.
 *     tags: [Provinces]
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: da nang
 *         description: |
 *           Loc theo ma (`code`) hoac ten (`name`).
 *           Khong phan biet hoa thuong, bo qua dau tieng Viet (vi du tim "da nang" ra ca "DA_NANG" va "Da Nang").
 *     responses:
 *       200:
 *         description: Thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - status
 *                 - message
 *                 - data
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Lay danh sach tinh thanh thanh cong
 *                 data:
 *                   type: array
 *                   description: Mang cac tinh/thanh; neu khong co `search` thi tra du 34 ban ghi
 *                   items:
 *                     type: object
 *                     required:
 *                       - code
 *                       - name
 *                     properties:
 *                       code:
 *                         type: string
 *                         description: Ma noi bo IN HOA, khong dau, snake_case
 *                         example: DA_NANG
 *                       name:
 *                         type: string
 *                         description: Ten hien thi tieng Viet chuan
 *                         example: Da Nang
 *                       lat:
 *                         type: number
 *                         description: Vi do WGS84 (trung tam hanh chinh)
 *                       lng:
 *                         type: number
 *                         description: Kinh do WGS84
 *             examples:
 *               fullList:
 *                 summary: Khong truyen search
 *                 value:
 *                   status: success
 *                   message: Lay danh sach tinh thanh thanh cong
 *                   data:
 *                     - code: HA_NOI
 *                       name: Ha Noi
 *                     - code: DA_NANG
 *                       name: Da Nang
 *               filtered:
 *                 summary: Co search
 *                 value:
 *                   status: success
 *                   message: Lay danh sach tinh thanh thanh cong
 *                   data:
 *                     - code: DA_NANG
 *                       name: Da Nang
 *       400:
 *         description: Query khong hop le
 */
router.get('/', (0, validate_middleware_1.validate)(province_dto_1.getProvincesQuerySchema), province_controller_1.getProvincesHandler);
exports.default = router;
//# sourceMappingURL=province.route.js.map