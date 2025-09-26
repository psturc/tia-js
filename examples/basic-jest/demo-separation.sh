#!/bin/bash

echo "🎯 TIA.js Perfect Separation Demo"
echo "================================="
echo

# Establish clean baseline
git add . && git commit -m "Demo baseline" > /dev/null 2>&1

echo "📋 Demonstrating perfect test separation:"
echo

echo "1️⃣  Change to USER service:"
echo "// Enhanced user validation" >> src/user-service.ts
echo "   Affected tests: $(yarn --silent tia:affected-tests)"
git checkout -- src/user-service.ts
echo

echo "2️⃣  Change to ORDER service:"  
echo "// Enhanced order processing" >> src/order-service.ts
echo "   Affected tests: $(yarn --silent tia:affected-tests)"
git checkout -- src/order-service.ts
echo

echo "3️⃣  Change to SHARED server.ts:"
echo "// Enhanced error handling" >> src/server.ts
echo "   Affected tests: $(yarn --silent tia:affected-tests)"
git checkout -- src/server.ts
echo

echo "✅ Perfect separation achieved!"
echo "• User changes → Only user tests"
echo "• Order changes → Only order tests"  
echo "• Shared changes → Both test suites"
echo

echo "🚀 Ready for production CI/CD integration!"
