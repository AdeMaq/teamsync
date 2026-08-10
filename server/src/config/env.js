import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  MONGO_URI: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  CLIENT_URL: Joi.string().required(),
}).unknown();

const { value: envVars, error } = envSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const env = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  MONGO_URI: envVars.MONGO_URI,
  JWT_ACCESS_SECRET: envVars.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: envVars.JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY: envVars.JWT_REFRESH_EXPIRY,
  CLIENT_URL: envVars.CLIENT_URL,
};