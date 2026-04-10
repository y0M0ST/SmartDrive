"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const data_source_1 = require("./config/data-source");
const apis_1 = __importDefault(require("./apis"));
const swagger_1 = require("./api-docs/swagger");
const error_handler_middleware_1 = require("./middleware/error-handler.middleware");
const port = process.env.PORT || 3000;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use('/api', apis_1.default);
(0, swagger_1.setupSwagger)(app);
app.use(error_handler_middleware_1.notFoundHandler);
app.use(error_handler_middleware_1.globalErrorHandler);
// Khởi động Database trước, lên thành công thì mới mở cổng Server API
data_source_1.AppDataSource.initialize()
    .then(() => {
    console.log('Đã kết nối thành công tới Database!');
    app.listen(port, () => {
        console.log(`Server dang chay o cong ${port}`);
        console.log(`Swagger docs: http://localhost:${port}/api/docs`);
    });
})
    .catch((error) => {
    console.error('Lỗi kết nối Database:', error);
});
//# sourceMappingURL=server.js.map