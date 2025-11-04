/**
 * Migration script to re-embed old memories with new 384-dim embeddings
 * Run with: tsx src/scripts/migrate-embeddings.ts
 */

import { config } from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeRAG } from '../rag/PineconeRAG.js';

config();

async function migrateEmbeddings() {
  console.log('🔄 Starting embedding migration...\n');

  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!pineconeKey) {
    throw new Error('PINECONE_API_KEY not set in .env');
  }

  // Check for embedding provider
  const hasCohere = !!process.env.COHERE_API_KEY;
  const hasHF = !!process.env.HF_API_TOKEN;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasCohere && !hasHF && !hasOpenAI) {
    throw new Error('No embedding provider configured. Set COHERE_API_KEY, HF_API_TOKEN, or OPENAI_API_KEY');
  }

  console.log('📡 Embedding provider:', hasCohere ? 'Cohere' : hasHF ? 'HuggingFace' : 'OpenAI');

  const pinecone = new Pinecone({ apiKey: pineconeKey });

  // List all indexes
  const indexList = await pinecone.listIndexes();
  console.log('\n📋 Available indexes:');
  indexList.indexes?.forEach((idx: any, i: number) => {
    console.log(`  ${i + 1}. ${idx.name} (${idx.dimension} dims)`);
  });

  // Find old indexes with different dimensions
  const oldIndexes = indexList.indexes?.filter((idx: any) => 
    idx.name.includes('supermemory') && idx.dimension !== 384
  ) || [];

  if (oldIndexes.length === 0) {
    console.log('\n✅ No old indexes found. All memories are already at 384 dimensions.');
    return;
  }

  console.log(`\n🔍 Found ${oldIndexes.length} old index(es) to migrate:`);
  oldIndexes.forEach((idx: any) => {
    console.log(`  - ${idx.name} (${idx.dimension} dims)`);
  });

  // Initialize new RAG with 384-dim
  const newRag = new PineconeRAG({
    apiKey: pineconeKey,
    indexName: 'supermemory',
    dimension: 384
  });
  await newRag.initialize();

  let totalMigrated = 0;

  // Migrate from each old index
  for (const oldIdx of oldIndexes) {
    console.log(`\n📦 Migrating from ${oldIdx.name}...`);
    
    const oldIndex = pinecone.index(oldIdx.name);
    
    // Fetch all vectors (in batches if needed)
    try {
      const stats = await oldIndex.describeIndexStats();
      const totalVectors = stats.totalRecordCount || 0;
      console.log(`  Found ${totalVectors} memories`);

      if (totalVectors === 0) continue;

      // Query to get all vectors (Pinecone doesn't have a direct "fetch all" for serverless)
      // We'll use a dummy query with high topK
      const queryResponse = await oldIndex.query({
        vector: new Array(oldIdx.dimension).fill(0),
        topK: Math.min(totalVectors, 10000),
        includeMetadata: true
      });

      console.log(`  Retrieved ${queryResponse.matches?.length || 0} memories`);

      // Re-embed and store each memory
      for (const match of queryResponse.matches || []) {
        const metadata = match.metadata as any;
        const content = metadata.content;
        
        if (!content) {
          console.warn(`  ⚠️ Skipping memory ${match.id} (no content)`);
          continue;
        }

        try {
          // Store with new embeddings (will auto-generate 384-dim embedding)
          await newRag.create(content, {
            userId: metadata.userId || 'default',
            conversationId: metadata.conversationId || 'default',
            messageType: metadata.messageType || 'user',
            importance: metadata.importance || 0.5,
            tags: metadata.tags ? metadata.tags.split(',') : [],
            category: metadata.category || 'general'
          } as any);

          totalMigrated++;
          if (totalMigrated % 10 === 0) {
            console.log(`  ✓ Migrated ${totalMigrated} memories...`);
          }
        } catch (err) {
          console.error(`  ❌ Failed to migrate memory ${match.id}:`, err);
        }
      }

      console.log(`  ✅ Completed migration from ${oldIdx.name}`);
    } catch (err) {
      console.error(`  ❌ Error migrating from ${oldIdx.name}:`, err);
    }
  }

  console.log(`\n🎉 Migration complete! Migrated ${totalMigrated} memories to 384-dim embeddings.`);
  console.log('\n💡 You can now delete the old indexes from Pinecone dashboard if desired:');
  oldIndexes.forEach((idx: any) => {
    console.log(`   - ${idx.name}`);
  });
}

// Run migration
migrateEmbeddings()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
