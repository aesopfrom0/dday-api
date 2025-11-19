import { Environment } from 'src/common/constant/environment';

export default () => ({
  app: {
    environment: process.env.NODE_ENV || Environment.LOCAL,
    port: +process.env.PORT,
    allowedCorsOrigins: process.env.ALLOWED_CORS_ORIGIN?.split(',') || [],
  },
  database: {
    uri: process.env.MONGODB_URI,
  },
});
