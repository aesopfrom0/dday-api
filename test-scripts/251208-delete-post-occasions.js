#!/usr/bin/env node
/**
 * [251208-delete-post-occasions]
 *
 * 작성 목적: post@malone.com 계정의 기념일 삭제
 * 사용법: node test-scripts/251208-delete-post-occasions.js
 * 주의: 이 스크립트는 데이터를 삭제합니다.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const POST_EMAIL = 'post@malone.com';

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // post 계정 찾기
    const postUser = await db.collection('users').findOne({ email: POST_EMAIL });
    if (!postUser) {
      console.error(`❌ post 계정을 찾을 수 없습니다: ${POST_EMAIL}`);
      process.exit(1);
    }
    console.log(`✅ post 계정 찾음: ${postUser.email} (ID: ${postUser._id})`);

    // 기존 데이터 삭제
    const result = await db.collection('occasions').deleteMany({ userId: postUser._id });
    console.log(`✅ ${result.deletedCount}개의 기념일이 삭제되었습니다.`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB 연결 종료');
  }
}

main();
