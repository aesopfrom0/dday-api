#!/usr/bin/env node
/**
 * Migration: Rename occasion fields to match new schema
 * Date: 2025-11-19
 *
 * Changes:
 * - milestoneRules -> suggestionRules
 * - customMilestones -> milestones
 *
 * Usage:
 *   node migrations/20251119-rename-occasion-fields.js up
 *   node migrations/20251119-rename-occasion-fields.js down
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

async function up(db) {
  console.log('🔄 Starting migration: rename occasion fields');

  // milestoneRules -> suggestionRules
  const result1 = await db.collection('occasions').updateMany(
    { milestoneRules: { $exists: true } },
    [
      { $set: { suggestionRules: '$milestoneRules' } },
      { $unset: 'milestoneRules' }
    ]
  );
  console.log(`✅ Renamed milestoneRules -> suggestionRules: ${result1.modifiedCount} documents`);

  // customMilestones -> milestones
  const result2 = await db.collection('occasions').updateMany(
    { customMilestones: { $exists: true } },
    [
      { $set: { milestones: '$customMilestones' } },
      { $unset: 'customMilestones' }
    ]
  );
  console.log(`✅ Renamed customMilestones -> milestones: ${result2.modifiedCount} documents`);

  console.log('✅ Migration completed successfully');
}

async function down(db) {
  console.log('🔄 Starting rollback: rename occasion fields');

  // suggestionRules -> milestoneRules
  const result1 = await db.collection('occasions').updateMany(
    { suggestionRules: { $exists: true } },
    [
      { $set: { milestoneRules: '$suggestionRules' } },
      { $unset: 'suggestionRules' }
    ]
  );
  console.log(`✅ Renamed suggestionRules -> milestoneRules: ${result1.modifiedCount} documents`);

  // milestones -> customMilestones
  const result2 = await db.collection('occasions').updateMany(
    { milestones: { $exists: true } },
    [
      { $set: { customMilestones: '$milestones' } },
      { $unset: 'milestones' }
    ]
  );
  console.log(`✅ Renamed milestones -> customMilestones: ${result2.modifiedCount} documents`);

  console.log('✅ Rollback completed successfully');
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down'].includes(command)) {
    console.error('Usage: node migrations/20251119-rename-occasion-fields.js [up|down]');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('📦 Connected to MongoDB');

    const db = client.db();

    if (command === 'up') {
      await up(db);
    } else {
      await down(db);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();
