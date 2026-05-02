import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getScoresSchema, recalculateScoresSchema } from './score.dto';
import * as scoreController from './score.controller';

const router = Router();
router.use(authMiddleware, requireRole(['AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Scores
 *     description: Điểm an toàn tài xế (US_13)
 */

/**
 * @swagger
 * /api/agencies/scores:
 *   get:
 *     summary: Bảng điểm an toàn tất cả tài xế (theo tháng/năm)
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, default: (tháng hiện tại) }
 *       - in: query
 *         name: year
 *         schema: { type: integer, default: (năm hiện tại) }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách điểm, sắp xếp theo final_score giảm dần
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 */
router.get('/', validate(getScoresSchema), scoreController.getScores);

/**
 * @swagger
 * /api/agencies/scores/export:
 *   get:
 *     summary: Xuất báo cáo điểm an toàn tháng ra file Excel (US_14)
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *         description: Tháng cần xuất (mặc định tháng hiện tại)
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Năm cần xuất (mặc định năm hiện tại)
 *     responses:
 *       200:
 *         description: File Excel tải về
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 */
router.get('/export', scoreController.exportScoresExcel);

/**
 * @swagger
 * /api/agencies/scores/recalculate:
 *   post:
 *     summary: Tính lại điểm an toàn cho toàn bộ tài xế trong tháng/năm
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tính lại thành công
 */
router.post('/recalculate', validate(recalculateScoresSchema), scoreController.recalculateScores);

export default router;
