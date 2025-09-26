#!/bin/bash

echo "🚀 TIA.js Node.js Server Demo"
echo "============================="
echo

echo "📋 Current Repository State:"
echo "• User Service (src/user-service.ts) - covered by user.test.ts"
echo "• Order Service (src/order-service.ts) - covered by order.test.ts"
echo "• Server routes (src/server.ts) - covered by both test files"
echo

echo "🔍 Step 1: Check what changed in this PR"
git diff --name-only HEAD | grep "src/" | head -5
echo

echo "🎯 Step 2: Get affected tests for CI/CD"
echo "Command: tia affected-tests --format specs"
AFFECTED_TESTS=$(yarn --silent tia:affected-tests)
echo "Affected tests: $AFFECTED_TESTS"
echo

echo "📊 Step 3: Detailed line-level analysis"
echo "Command: tia line-analysis"
yarn --silent tia:line-analysis
echo

echo "⚡ Step 4: CI/CD Integration Example"
if [ -n "$AFFECTED_TESTS" ]; then
    echo "Would run: jest --testPathPattern=\"($AFFECTED_TESTS)\""
    echo "✅ Only affected tests run - significant speedup!"
else
    echo "✅ No tests affected - skip test execution entirely!"
fi
echo

echo "🎉 Node.js Server TIA Demo Complete!"
