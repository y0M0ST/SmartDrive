import path from 'path';
import type { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SmartDrive Backend API',
            version: '1.0.0',
            description:
                'API documentation for Frontend integration. Generated from route files.',
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:3000',
                description: 'Current backend server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                /** Header `x-device-api-key` — trùng `MASTER_DEVICE_API_KEY` (ingest thiết bị). */
                deviceApiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-device-api-key',
                },
            },
        },
    },
    apis: [path.resolve(__dirname, '../apis/**/*.route.ts')],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

export function setupSwagger(app: Express): void {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api/docs.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}
