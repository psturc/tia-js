# TIA.js Jest Example - Node.js Server

This example demonstrates **Test Impact Analysis** for a Node.js Express server with **Jest unit tests**.

## 🎯 What This Demonstrates

- **Line-level TIA** for backend services
- **Perfect separation** between user tests vs. order tests  
- **Jest integration** with per-test coverage collection
- **CI/CD workflow** for Node.js applications

## 🏗️ Architecture

```
src/
├── server.ts          # Express app with user & order endpoints
├── user-service.ts    # User business logic (covered by user.test.ts)
├── order-service.ts   # Order business logic (covered by order.test.ts)
├── user.test.ts       # Tests user endpoints & UserService
└── order.test.ts      # Tests order endpoints & OrderService

.tia/
└── per-test-coverage/ # Per-test Jest coverage data
```

## 🚀 Usage

### Run Tests with Coverage Collection
```bash
yarn test:coverage
# Generates per-test coverage in .tia/per-test-coverage/
```

### TIA Analysis
```bash
# Make changes to source files
echo "// Enhanced validation" >> src/user-service.ts

# See detailed impact analysis  
yarn tia:line-analysis

# Get affected tests for CI/CD
yarn tia:affected-tests
```

## 📊 Example Results

**Change to `src/user-service.ts`:**
```
Summary:
  Total changed lines: 1
  Coverage percentage: 100.0%
  Affected tests: 7

Result: Only user.test.ts runs (order tests skipped)
```

**Change to `src/order-service.ts`:**
```
Summary:  
  Total changed lines: 1
  Coverage percentage: 100.0%
  Affected tests: 7

Result: Only order.test.ts runs (user tests skipped)
```

## 🔧 Jest Configuration

### jest.config.js
- **Per-test coverage collection** via custom reporter
- **Coverage directory** set to `.tia/jest-coverage`
- **TypeScript support** with ts-jest

### jest-tia-reporter.js
- **Custom Jest reporter** for TIA integration
- **Saves individual test coverage** to `.tia/per-test-coverage/`
- **Safe filename generation** for cross-platform compatibility

## ⚡ CI/CD Integration

### Example Pipeline
```bash
# Sync coverage data from TIA server
curl -o .tia.tar.gz https://your-tia-server/latest-coverage
tar -xzf .tia.tar.gz

# Get affected tests
AFFECTED_TESTS=$(tia affected-tests --format specs)

# Run only affected tests  
if [ -n "$AFFECTED_TESTS" ]; then
  jest --testPathPattern="($AFFECTED_TESTS)"
else
  echo "No tests affected - skipping test execution"
fi
```

### Benefits
- **50-90% faster CI/CD** (only run affected tests)
- **Surgical precision** (line-level change detection)
- **Resource optimization** (reduce compute costs)
- **Faster feedback** (developers get results quicker)

## 🧪 Demo

Run `./demo-node-tia.sh` to see the complete workflow in action!

---

**Next Steps**: 
1. Set up TIA server for coverage data synchronization
2. Integrate into your CI/CD pipeline
3. Enjoy faster, more precise test execution! 🚀