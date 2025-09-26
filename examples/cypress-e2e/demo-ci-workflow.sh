#!/bin/bash

echo "🚀 TIA.js PR Workflow Demo"
echo "=========================="
echo

echo "📋 Step 1: Check what changed in this PR"
echo "Command: git diff --name-only HEAD"
git diff --name-only HEAD | grep "src/" || echo "No source file changes"
echo

echo "🔍 Step 2: Detailed impact analysis (for developers)"
echo "Command: tia line-analysis"
yarn tia line-analysis
echo

echo "🎯 Step 3: Get affected tests for CI/CD"
echo "Command: tia affected-tests --format specs"
AFFECTED_TESTS=$(yarn --silent tia affected-tests --format specs)
echo "Affected tests: $AFFECTED_TESTS"
echo

echo "⚡ Step 4: Run only affected tests (simulated)"
if [ -n "$AFFECTED_TESTS" ]; then
    echo "Would run: cypress run --spec \"$AFFECTED_TESTS\""
    echo "✅ Only affected tests run - massive CI/CD speedup!"
else
    echo "✅ No tests affected - skip test execution entirely!"
fi
echo

echo "🎉 TIA Workflow Complete!"
echo "Instead of running ALL tests, we identified and ran only the precise tests affected by code changes."
