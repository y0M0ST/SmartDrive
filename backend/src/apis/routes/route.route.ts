import { Router } from 'express';
import * as routeController from './route.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    changeRouteStatusSchema,
    createRouteSchema,
    getRouteQuerySchema,
    routeIdParamSchema,
    updateRouteSchema,
} from './route.dto';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN', 'COORDINATOR']));

/**
 * @swagger
 * tags:
 *   - name: Routes
 *     description: Quan ly danh muc tuyen duong
 */

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Lay danh sach tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hien tai
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: So luong ban ghi moi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tim kiem theo ten tuyen
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED]
 *         description: Loc theo trang thai tuyen
 *     responses:
 *       200:
 *         description: Lay danh sach thanh cong
 *       400:
 *         description: Query khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *   post:
 *     summary: Tao tuyen duong moi
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - start_point
 *               - end_point
 *               - distance_km
 *               - estimated_hours
 *             properties:
 *               name:
 *                 type: string
 *                 example: Da Nang - Hue
 *               start_point:
 *                 type: string
 *                 description: Ma tinh thanh (GET /api/provinces)
 *                 example: DA_NANG
 *               end_point:
 *                 type: string
 *                 description: Ma tinh thanh (GET /api/provinces)
 *                 example: THUA_THIEN_HUE
 *               distance_km:
 *                 type: number
 *                 example: 102.5
 *               estimated_hours:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       201:
 *         description: Tao tuyen thanh cong
 *       400:
 *         description: Du lieu dau vao khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 */
router.get('/', validate(getRouteQuerySchema), routeController.getRoutes);
router.post('/', validate(createRouteSchema), routeController.createRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Cap nhat thong tin tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID cua tuyen duong
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Da Nang - Hue (cao toc)
 *               start_point:
 *                 type: string
 *                 example: DA_NANG
 *               end_point:
 *                 type: string
 *                 example: THUA_THIEN_HUE
 *               distance_km:
 *                 type: number
 *                 example: 98.2
 *               estimated_hours:
 *                 type: number
 *                 example: 2.3
 *     responses:
 *       200:
 *         description: Cap nhat thanh cong
 *       400:
 *         description: Du lieu khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *       404:
 *         description: Khong tim thay tuyen duong
 *   delete:
 *     summary: Xoa mem tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID cua tuyen duong
 *     responses:
 *       200:
 *         description: Xoa mem thanh cong
 *       400:
 *         description: Khong the xoa vi dang co chuyen di chua chay hoac dang chay
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *       404:
 *         description: Khong tim thay tuyen duong
 */
router.put('/:id', validate(routeIdParamSchema.merge(updateRouteSchema)), routeController.updateRoute);
router.delete('/:id', validate(routeIdParamSchema), routeController.deleteRoute);

/**
 * @swagger
 * /api/routes/{id}/status:
 *   patch:
 *     summary: Cap nhat trang thai tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID cua tuyen duong
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED]
 *                 example: SUSPENDED
 *     responses:
 *       200:
 *         description: Doi trang thai thanh cong
 *       400:
 *         description: Trang thai khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *       404:
 *         description: Khong tim thay tuyen duong
 */
router.patch('/:id/status', validate(routeIdParamSchema.merge(changeRouteStatusSchema)), routeController.changeStatus);

export default router;