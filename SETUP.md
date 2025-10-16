# 🔧 Setup Instructions

Complete setup guide for Supermemory.

## 📋 Prerequisites

- **Node.js**: v18+ (recommended v20+)
- **npm**: v9+ (comes with Node.js)
- **Operating System**: Windows, macOS, or Linux

Check your versions:
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

## 🚀 Installation

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `@xenova/transformers` - Local embeddings
- `faiss-node` - Vector database
- `uuid` - Unique IDs
- `typescript` - TypeScript compiler
- `tsx` - TypeScript executor

**Note:** First install may take 2-3 minutes as it compiles native modules.

### Step 2: Verify Installation

```bash
npm run test
```

You should see:
```
🚀 Supermemory Demo - Mock LLM
============================================================
🧠 Loading embedding model: Xenova/all-MiniLM-L6-v2...
✅ Embedding model loaded successfully
✅ Vector store initialized with dimension 384
...
```

## 🎯 What Gets Installed

### Core Dependencies

#### @xenova/transformers (v2.17.1)
- **Purpose**: Generate embeddings locally
- **Model**: all-MiniLM-L6-v2 (384 dimensions)
- **Size**: ~80MB (downloads on first use)
- **Speed**: 50-100ms per text
- **Cost**: FREE

#### faiss-node (v0.5.1)
- **Purpose**: Fast vector similarity search
- **Algorithm**: L2 distance (exact search)
- **Speed**: <10ms for 10K vectors
- **Cost**: FREE

#### uuid (v9.0.1)
- **Purpose**: Generate unique memory IDs
- **Standard**: RFC4122 v4

### Dev Dependencies

#### TypeScript (v5.3.3)
- **Purpose**: Type checking and compilation
- **Target**: ES2022

#### tsx (v4.7.0)
- **Purpose**: Run TypeScript directly
- **Use**: Development and testing

## 📁 Directory Structure After Install

```
windsurf-project/
├── node_modules/          # Dependencies
├── src/                   # Source code
├── data/                  # Created on first run
│   ├── memories.json      # Memory metadata
│   └── faiss.index        # Vector index
├── dist/                  # Compiled JS (after build)
├── package.json
├── tsconfig.json
└── ...docs
```

## 🧪 Testing

### Run All Examples

```bash
# Simple usage (no LLM)
npx tsx src/examples/simple-usage.ts

# Mock LLM demo (recommended first)
npx tsx src/examples/mock-llm-demo.ts

# Gigzs integration example
npx tsx src/examples/gigzs-integration.ts
```

### Build for Production

```bash
npm run build
```

Creates compiled JavaScript in `dist/` folder.

### Run Built Version

```bash
npm start
```

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` file:
```bash
# Copy example
cp .env.example .env

# Edit with your values
# Only needed if using external LLM APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Custom Configuration

```typescript
const memory = new Supermemory({
  // Storage location
  storagePath: './data/my-app',
  
  // Embedding model (default is best for most cases)
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  
  // Vector dimension (must match model)
  vectorDimension: 384,
  
  // Max memories (soft limit)
  maxMemories: 100000
});
```

## 🐛 Troubleshooting

### Issue 1: `npm install` fails

**Error:** `gyp ERR! build error`

**Cause:** faiss-node requires native compilation

**Solution (Windows):**
```bash
# Install build tools
npm install --global windows-build-tools

# Try again
npm install
```

**Solution (Mac):**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Try again
npm install
```

**Solution (Linux):**
```bash
# Install build essentials
sudo apt-get install build-essential

# Try again
npm install
```

### Issue 2: Model download fails

**Error:** `Failed to fetch model`

**Cause:** Network issues or firewall

**Solution:**
```bash
# The model downloads automatically on first use
# If it fails, it will retry on next run
# Or manually download from Hugging Face
```

### Issue 3: TypeScript errors

**Error:** `Cannot find module`

**Solution:**
```bash
# Rebuild
npm run build

# Or use tsx directly
npx tsx src/examples/simple-usage.ts
```

### Issue 4: Permission denied

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions (Mac/Linux)
sudo chown -R $USER ~/.npm

# Or use npx
npx tsx src/examples/simple-usage.ts
```

### Issue 5: Out of memory

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in package.json scripts:
"test": "NODE_OPTIONS='--max-old-space-size=4096' tsx src/examples/mock-llm-demo.ts"
```

## ✅ Verify Everything Works

Run this quick test:

```bash
npx tsx -e "
import { Supermemory } from './src/core/Supermemory.js';

const memory = new Supermemory();
await memory.initialize();

await memory.remember('Test memory');
const results = await memory.recall({ query: 'test', topK: 1 });

console.log('✅ Supermemory is working!');
console.log('Found:', results[0]?.memory.content);
"
```

Expected output:
```
🧠 Loading embedding model...
✅ Embedding model loaded successfully
✅ Vector store initialized
💾 Memory added: ...
✅ Supermemory is working!
Found: Test memory
```

## 🚀 Production Deployment

### 1. Build the Project

```bash
npm run build
```

### 2. Set Environment Variables

```bash
# Production settings
export NODE_ENV=production
export SUPERMEMORY_STORAGE_PATH=/var/data/memories
```

### 3. Run with PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start dist/index.js --name supermemory

# Monitor
pm2 logs supermemory

# Auto-restart on reboot
pm2 startup
pm2 save
```

### 4. Docker (Optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

## 📊 Performance Optimization

### 1. Pre-load Model at Startup

```typescript
// In your app initialization
const memory = new Supermemory();
await memory.initialize(); // Loads model immediately
```

### 2. Batch Operations

```typescript
// Instead of multiple remember() calls
await memory.rememberBatch([
  { content: "Memory 1", metadata: {} },
  { content: "Memory 2", metadata: {} }
]);
```

### 3. Periodic Saves

```typescript
// Save every 5 minutes
setInterval(async () => {
  await memory.save();
}, 5 * 60 * 1000);
```

### 4. Memory Cleanup

```typescript
// Remove old memories periodically
const oldMemories = memory.exportMemories()
  .filter(m => Date.now() - m.timestamp > 90 * 24 * 60 * 60 * 1000);

// Implement deletion (coming soon)
```

## 🔐 Security Best Practices

### 1. Secure Storage Path

```typescript
// Use absolute paths outside web root
const memory = new Supermemory({
  storagePath: '/var/secure/memories'
});
```

### 2. Encrypt Sensitive Data

```typescript
import crypto from 'crypto';

function encrypt(text: string): string {
  // Implement encryption
  return encryptedText;
}

await memory.remember(encrypt(sensitiveData));
```

### 3. User Data Isolation

```typescript
// Always filter by userId
const results = await memory.recall({
  query: userQuery,
  filter: { userId: authenticatedUserId }
});
```

### 4. Rate Limiting

```typescript
// Implement rate limiting on API endpoints
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/chat', limiter);
```

## 📈 Monitoring

### 1. Log Memory Stats

```typescript
setInterval(() => {
  const stats = memory.getStats();
  console.log(`Memories: ${stats.totalMemories}`);
}, 60 * 1000);
```

### 2. Track Performance

```typescript
const start = Date.now();
const results = await memory.recall({ query });
console.log(`Search took: ${Date.now() - start}ms`);
```

### 3. Monitor Storage Size

```bash
# Check data directory size
du -sh ./data
```

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Test runs successfully (`npm run test`)
- [ ] Examples work
- [ ] Environment variables set (if using external APIs)
- [ ] Storage path configured
- [ ] Production build tested (`npm run build`)
- [ ] Monitoring set up
- [ ] Backups configured

## 🎉 You're All Set!

Your Supermemory system is ready to use!

**Next Steps:**
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Try the examples
3. Integrate with your app
4. Deploy to production

**Need Help?**
- Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- Review [ARCHITECTURE.md](./ARCHITECTURE.md)
- See [COMPARISON.md](./COMPARISON.md)

Happy coding! 🚀
