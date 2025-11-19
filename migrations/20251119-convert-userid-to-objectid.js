#!/usr/bin/env node
/**
 * Migration: Convert userId from string to ObjectId
 * Date: 2025-11-19
 *
 * Changes:
 * - Convert userId field from string to ObjectId in occasions collection
 *
 * Usage:
 *   node migrations/20251119-convert-userid-to-objectid.js up
 *   node migrations/20251119-convert-userid-to-objectid.js down
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

async function up(db) {
  console.log('🔄 Starting migration: convert userId to ObjectId');

  const occasions = await db.collection('occasions').find({ userId: { $type: 'string' } }).toArray();

  if (occasions.length === 0) {
    console.log('ℹ️  No documents to convert');
    return;
  }

  let converted = 0;
  for (const doc of occasions) {
    await db.collection('occasions').updateOne(
      { _id: doc._id },
      { $set: { userId: new ObjectId(doc.userId) } }
    );
    console.log(`✅ Converted: ${doc._id} - userId: ${doc.userId}`);
    converted++;
  }

  console.log(`✅ Migration completed: ${converted} documents converted`);
}

async function down(db) {
  console.log('🔄 Starting rollback: convert userId to string');

  const occasions = await db.collection('occasions').find({ userId: { $type: 'objectId' } }).toArray();

  if (occasions.length === 0) {
    console.log('ℹ️  No documents to convert');
    return;
  }

  let converted = 0;
  for (const doc of occasions) {
    await db.collection('occasions').updateOne(
      { _id: doc._id },
      { $set: { userId: doc.userId.toString() } }
    );
    console.log(`✅ Converted: ${doc._id} - userId: ${doc.userId}`);
    converted++;
  }

  console.log(`✅ Rollback completed: ${converted} documents converted`);
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down'].includes(command)) {
    console.error('Usage: node migrations/20251119-convert-userid-to-objectid.js [up|down]');
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
