"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvincesHandler = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const serviceResponse_1 = require("../../models/serviceResponse");
const province_service_1 = require("./province.service");
function readSearchQueryParam(query) {
    const raw = query.search;
    if (raw === undefined)
        return undefined;
    if (typeof raw === 'string')
        return raw;
    return undefined;
}
exports.getProvincesHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const search = readSearchQueryParam(req.query);
    const data = (0, province_service_1.getProvinces)(search);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Lấy danh sách tỉnh thành thành công', data));
});
//# sourceMappingURL=province.controller.js.map