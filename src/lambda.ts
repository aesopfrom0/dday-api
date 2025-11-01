import { APIGatewayProxyHandler, Handler } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';
import { createApp } from './bootstrap';

let server: APIGatewayProxyHandler;

// 이 함수가 serverless-express 설정을 완료하고 핸들러를 반환합니다
async function bootstrap() {
  const expressApp = express();
  const app = await createApp({ expressApp });
  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
