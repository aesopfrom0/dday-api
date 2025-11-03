import Joi from 'joi';
import { Environment } from 'src/common/constant/environment';

/*
  디폴트 값은 아래 스키마에서 지정하기 보다는
  configuration.ts에서 지정하는 것을 권장합니다.
*/
export function validateSchema() {
  return Joi.object({
    NODE_ENV: Joi.string().valid(...Object.values(Environment)),
    PORT: Joi.number().required(),
    ALLOWED_CORS_ORIGIN: Joi.string(),
    MONGODB_URI: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    GOOGLE_CLIENT_ID: Joi.string().optional(),
    GOOGLE_CLIENT_SECRET: Joi.string().optional(),
    GOOGLE_CALLBACK_URL: Joi.string().optional(),
    APPLE_CLIENT_ID: Joi.string().optional(),
    APPLE_CLIENT_SECRET: Joi.string().optional(),
  });
}
