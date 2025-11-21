import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../src/users/schemas/user.schema';

/**
 * 기존 사용자들의 빈 settings를 기본값으로 채우는 마이그레이션
 *
 * 실행: npx ts-node migrations/20251119-fill-user-settings.ts
 *
 * 목적:
 * - settings 필드가 비어있거나 null인 사용자들에게 기본값 설정
 * - defaultMilestoneDisplayCount: '2'
 * - language: 'ko'
 * - theme: 'system'
 */

async function fillUserSettings() {
  console.log('🚀 Starting user settings migration...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<UserDocument>>('UserModel');

  try {
    // settings가 없거나 비어있는 사용자 찾기
    const usersWithoutSettings = await userModel
      .find({
        $or: [
          { settings: { $exists: false } },
          { settings: null },
          { settings: {} },
          { 'settings.defaultMilestoneDisplayCount': { $exists: false } },
          { 'settings.language': { $exists: false } },
          { 'settings.theme': { $exists: false } },
        ],
      })
      .exec();

    console.log(
      `📊 Found ${usersWithoutSettings.length} users with incomplete settings\n`,
    );

    if (usersWithoutSettings.length === 0) {
      console.log('✅ All users already have complete settings!');
      await app.close();
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    // 각 사용자 업데이트
    for (const user of usersWithoutSettings) {
      try {
        const defaultSettings = {
          defaultMilestoneDisplayCount: '2',
          language: 'ko',
          theme: 'system',
        };

        // 기존 settings와 병합 (일부만 있는 경우 대비)
        const updatedSettings = {
          defaultMilestoneDisplayCount:
            user.settings?.defaultMilestoneDisplayCount ||
            defaultSettings.defaultMilestoneDisplayCount,
          language: user.settings?.language || defaultSettings.language,
          theme: user.settings?.theme || defaultSettings.theme,
        };

        await userModel
          .updateOne(
            { _id: user._id },
            {
              $set: {
                settings: updatedSettings,
              },
            },
          )
          .exec();

        updatedCount++;
        console.log(
          `  ✓ Updated user: ${user.email} (${user._id}) - settings filled`,
        );
      } catch (error) {
        errorCount++;
        console.error(
          `  ✗ Failed to update user: ${user.email} (${user._id})`,
          error.message,
        );
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  • Total users processed: ${usersWithoutSettings.length}`);
    console.log(`  • Successfully updated: ${updatedCount}`);
    console.log(`  • Errors: ${errorCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  No users were updated.');
    }

    // 검증: 업데이트 후 확인
    const remainingUsers = await userModel
      .find({
        $or: [
          { 'settings.defaultMilestoneDisplayCount': { $exists: false } },
          { 'settings.language': { $exists: false } },
          { 'settings.theme': { $exists: false } },
        ],
      })
      .exec();

    if (remainingUsers.length > 0) {
      console.log(
        `\n⚠️  Warning: ${remainingUsers.length} users still have incomplete settings`,
      );
      remainingUsers.forEach((u) => {
        console.log(`  - ${u.email} (${u._id})`);
      });
    } else {
      console.log('\n🎉 All users now have complete settings!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// 실행
fillUserSettings()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
