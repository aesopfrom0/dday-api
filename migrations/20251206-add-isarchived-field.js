#!/usr/bin/env node
/**
 * [251206] 기존 Occasion 문서에 isArchived 필드 추가
 *
 * 작성 목적: 아카이브 기능 추가에 따른 기존 데이터 마이그레이션
 * - 모든 기존 occasions에 isArchived: false 추가
 * - archivedAt: null 추가
 *
 * 사용법: node migrations/add-isarchived-field.js
 *
 * 주의: 이 스크립트는 기존 데이터를 수정합니다.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  'process.env.MONGODB_URI || 'mongodb://localhost:27017/dday'';

async function migrate() {
  try {
    console.log('📦 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 완료');

    const db = mongoose.connection.db;
    const occasionsCollection = db.collection('occasions');

    // isArchived 필드가 없는 문서 조회
    const documentsWithoutField = await occasionsCollection.countDocuments({
      isArchived: { $exists: false },
    });

    console.log(`\n📊 마이그레이션 대상: ${documentsWithoutField}개 문서`);

    if (documentsWithoutField === 0) {
      console.log('✅ 마이그레이션할 문서가 없습니다.');
      return;
    }

    // 확인 메시지 (실제로는 바로 실행)
    console.log('\n🔧 마이그레이션 시작...');

    // 모든 기존 문서에 isArchived: false, archivedAt: null 추가
    const result = await occasionsCollection.updateMany(
      { isArchived: { $exists: false } },
      {
        $set: {
          isArchived: false,
          archivedAt: null,
        },
      },
    );

    console.log(`✅ 마이그레이션 완료: ${result.modifiedCount}개 문서 업데이트`);

    // 검증
    const verifyCount = await occasionsCollection.countDocuments({
      isArchived: { $exists: true },
    });
    const totalCount = await occasionsCollection.countDocuments({});

    console.log(`\n📊 검증 결과:`);
    console.log(`   - 전체 문서: ${totalCount}개`);
    console.log(`   - isArchived 필드 있음: ${verifyCount}개`);

    if (verifyCount === totalCount) {
      console.log('✅ 모든 문서가 정상적으로 마이그레이션되었습니다.');
    } else {
      console.log('⚠️  일부 문서가 마이그레이션되지 않았습니다.');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 MongoDB 연결 종료');
  }
}

// 실행
migrate();
