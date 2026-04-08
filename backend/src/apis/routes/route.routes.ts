import { Router } from 'express';
import { authenticate, requireManagementAccess } from '../../common/middlewares/auth.middleware';
import {
  createRoute,
  deleteRoute,
  getRouteById,
  listRoutes,
  updateRoute,
} from './route.controller';
import {
  validateCreateRoute,
  validateRouteId,
  validateUpdateRoute,
} from './route.validator';

const router = Router();

router.use(authenticate);
router.use(requireManagementAccess);

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Lay danh sach tuyen duong
 *     tags: [Routes]
 *     description: Lay toan bo danh sach tuyen duong trong he thong. Bao gom so luong chuyen di lien ket.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lay danh sach tuyen duong thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lay danh sach tuyen duong thanh cong
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RouteResponse'
 */
router.get('/', listRoutes);

/**
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Lay chi tiet tuyen duong
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
 *         description: ID tuyen duong
 *     responses:
 *       200:
 *         description: Lay thong tin tuyen duong thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lay thong tin tuyen duong thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/RouteResponse'
 *       404:
 *         description: Khong tim thay tuyen duong
 */
router.get('/:id', validateRouteId, getRouteById);

/**
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Them tuyen duong moi
 *     tags: [Routes]
 *     description: Tao moi tuyen duong. Trang thai mac dinh la "Dang khai thac" (is_active = true).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoutePayload'
 *     responses:
 *       201:
 *         description: Them tuyen duong thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Them tuyen duong thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/RouteResponse'
 *       400:
 *         description: Du lieu khong hop le
 *       409:
 *         description: Ten tuyen duong da ton tai
 */
router.post('/', validateCreateRoute, createRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Cap nhat tuyen duong
 *     tags: [Routes]
 *     description: Cap nhat thong tin tuyen duong. Co the doi trang thai sang "Tam ngung" (is_active = false).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID tuyen duong
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoutePayload'
 *     responses:
 *       200:
 *         description: Cap nhat tuyen duong thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cap nhat tuyen duong thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/RouteResponse'
 *       404:
 *         description: Khong tim thay tuyen duong
 *       409:
 *         description: Ten tuyen duong da ton tai
 */
router.put('/:id', validateRouteId, validateUpdateRoute, updateRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   delete:
 *     summary: Xoa tuyen duong
 *     tags: [Routes]
 *     description: Xoa tuyen duong. Chi xoa duoc khi tuyen chua co chuyen xe nao lien ket. Neu dang co lich trinh, hay chuyen sang Tam ngung thay vi xoa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID tuyen duong
 *     responses:
 *       200:
 *         description: Xoa tuyen duong thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Xoa tuyen duong thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/RouteDeleteResponse'
 *       404:
 *         description: Khong tim thay tuyen duong
 *       409:
 *         description: Tuyen duong dang co lich trinh hoat dong
 */
router.delete('/:id', validateRouteId, deleteRoute);

export default router;
