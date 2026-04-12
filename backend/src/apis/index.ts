import { Router } from 'express';
import authRoutes from './auth/auth.route';
import agencyRoutes from './agencies/agency.route';
import userRoutes from './users/user.route';
import roleRoutes from './roles/role.route';
import driverProfileRoutes from './driver-profiles/driver-profile.route';
import vehicleRoutes from './vehicles/vehicle.route';
import routeRoutes from './routes/route.route';
import provinceRoutes from './provinces/province.route';

const router = Router();
router.use('/auth', authRoutes);
router.use('/agencies', agencyRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/users', driverProfileRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/routes', routeRoutes);
router.use('/provinces', provinceRoutes);

export default router;