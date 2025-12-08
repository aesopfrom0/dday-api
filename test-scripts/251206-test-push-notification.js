#!/usr/bin/env node
/**
 * [251206-테스트 푸시 알림]
 *
 * 작성 목적: TestFlight dev 환경에서 푸시 알림이 오지 않는 문제 진단
 * 사용법:
 *   1. .env.local 파일에 다음 변수 설정:
 *      TEST_JWT_TOKEN=your_jwt_token_here
 *      TEST_OCCASION_ID=occasion_id_here
 *
 *   2. 실행:
 *      node test-scripts/251206-test-push-notification.js
 *
 *   3. 또는 환경변수로 직접 설정:
 *      export JWT_TOKEN="eyJhbGc..." OCCASION_ID="674d..." node test-scripts/251206-test-push-notification.js
 *
 * 주의: 이 스크립트는 테스트 알림을 발송하는 POST 요청을 보냅니다.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// .env 파일 로드 (우선순위: .env.local > .env.dev)
function loadEnv() {
  const envFiles = ['.env.local', '.env.dev'];
  const projectRoot = path.join(__dirname, '..');

  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    if (fs.existsSync(envPath)) {
      console.log(`📄 환경변수 로드: ${envFile}\n`);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // 따옴표 제거
          value = value.replace(/^["']|["']$/g, '');
          // 환경변수에 이미 값이 있으면 덮어쓰지 않음
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      break;
    }
  }
}

loadEnv();

// 환경변수 (명령줄 > .env.local의 TEST_* > 하드코딩된 기본값)
const API_URL = process.env.API_URL || process.env.API_BASE_URL || 'https://qwul1zxd01.execute-api.ap-northeast-2.amazonaws.com';
const JWT_TOKEN = process.env.JWT_TOKEN || process.env.TEST_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTJkNDUzYzcwOTYyMjEwOTVmYjFiMWYiLCJlbWFpbCI6ImVlLmNoYW5nc3ViQGdtYWlsLmNvbSIsImF1dGhQcm92aWRlciI6Imdvb2dsZSIsImlhdCI6MTc2NTA4MDkwNCwiZXhwIjoxNzY1MDkxNzA0fQ.kIBHESqMcpurjvkn_P_UoGtAs3dfi3dyulYOJdlGO9k';
const OCCASION_ID = process.env.OCCASION_ID || process.env.TEST_OCCASION_ID || '6932c99658c4f7537165a6dd';

// JWT_TOKEN과 OCCASION_ID는 이제 하드코딩된 기본값이 있으므로 체크하지 않음
// 필요시 .env.local에서 오버라이드 가능

async function sendTestNotification() {
  console.log('📱 테스트 푸시 알림 발송 시작...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Occasion ID: ${OCCASION_ID}`);
  console.log(`JWT Token: ${JWT_TOKEN.substring(0, 20)}...\n`);

  const url = new URL(`${API_URL}/occasions/${OCCASION_ID}/test-notification`);
  const protocol = url.protocol === 'https:' ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n📊 응답 상태: ${res.statusCode}\n`);

        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ 테스트 알림 발송 성공!\n');
            console.log('📋 결과:');
            console.log(`   - 성공: ${response.successCount || 0}개 디바이스`);
            console.log(`   - 실패: ${response.failureCount || 0}개 디바이스`);

            if (response.responses && response.responses.length > 0) {
              console.log('\n📱 디바이스별 상세 결과:');
              response.responses.forEach((r, idx) => {
                console.log(`   [${idx + 1}] ${r.success ? '✅ 성공' : '❌ 실패'}`);
                if (r.error) {
                  console.log(`       에러: ${r.error.code} - ${r.error.message}`);
                }
              });
            }

            console.log('\n🔍 진단:');
            if (response.successCount > 0) {
              console.log('   ✅ FCM 토큰이 유효하고 Firebase 연결이 정상입니다.');
              console.log('   ✅ 푸시 알림이 디바이스로 전송되었습니다.');
              console.log('\n   💡 디바이스에서 알림을 받지 못했다면:');
              console.log('      1. 앱이 포그라운드 상태인지 확인 (포그라운드에서는 silent notification 표시 안됨)');
              console.log('      2. iOS 설정 > [앱] > 알림 권한 확인');
              console.log('      3. Firebase Console > APNs Production 인증서 확인 (TestFlight는 Production 환경)');
            } else if (response.failureCount > 0) {
              console.log('   ❌ 알림 발송에 실패했습니다.');
              console.log('\n   💡 가능한 원인:');
              console.log('      1. Firebase에 APNs Production 인증서가 등록되지 않음');
              console.log('      2. FCM 토큰이 만료되었거나 유효하지 않음');
              console.log('      3. 앱이 삭제되었거나 재설치됨');
              console.log('\n   🔧 해결 방법:');
              console.log('      1. Firebase Console > Cloud Messaging > Apple app configuration 확인');
              console.log('      2. 앱을 재실행하여 FCM 토큰 재등록');
            }

          } else if (res.statusCode === 404) {
            console.log('❌ 기념일을 찾을 수 없습니다.');
            console.log('   OCCASION_ID를 확인해주세요.');
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            console.log('❌ 인증 실패');
            console.log('   JWT_TOKEN을 확인해주세요.');
          } else {
            console.log('❌ 오류 발생:');
            console.log(JSON.stringify(response, null, 2));
          }

          resolve(response);
        } catch (error) {
          console.log('원본 응답:');
          console.log(data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 요청 실패:', error.message);
      reject(error);
    });

    req.end();
  });
}

// 실행
sendTestNotification()
  .then(() => {
    console.log('\n✅ 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 테스트 실패:', error.message);
    process.exit(1);
  });
