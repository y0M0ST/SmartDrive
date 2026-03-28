import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'SmartDrive API',
      version:     '1.0.0',
      description: 'API documentation cho hệ thống SmartDrive',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/apis/**/*.routes.ts'], // Quét tất cả file routes
};

export const swaggerSpec = swaggerJsdoc(options);