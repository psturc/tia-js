"""
Pytest plugin for TIA (Test Impact Analysis) coverage collection.
This plugin collects Python coverage data during test execution.
"""

import json
import os
import re
from pathlib import Path
import coverage

class TIACoveragePlugin:
    """Pytest plugin for collecting per-test coverage data for TIA."""
    
    def __init__(self):
        self.per_test_coverage_dir = Path('.tia/per-test-coverage')
        self.coverage_dir = Path('.tia/python-coverage')
        self.cov = None
        self.current_test = None
        
        # Ensure directories exist
        self.per_test_coverage_dir.mkdir(parents=True, exist_ok=True)
        self.coverage_dir.mkdir(parents=True, exist_ok=True)
    
    def pytest_configure(self, config):
        """Called after command line options have been parsed."""
        print("[TIA-Python] Starting test suite with coverage collection")
    
    def pytest_runtest_setup(self, item):
        """Called before each test is run."""
        self.current_test = item
        
        # Start coverage collection for this test
        self.cov = coverage.Coverage(
            source=['.'],
            omit=['tests/*', 'pytest_tia_plugin.py', '.tia/*']
        )
        self.cov.start()
        
        test_name = self.sanitize_test_name(item.name)
        print(f"[TIA-Python] Starting coverage for test: {test_name}")
    
    def pytest_runtest_teardown(self, item, nextitem):
        """Called after each test is run."""
        if self.cov and self.current_test:
            # Stop coverage collection
            self.cov.stop()
            
            # Save coverage data for this test
            self.save_test_coverage(item)
            
            test_name = self.sanitize_test_name(item.name)
            print(f"[TIA-Python] Collected coverage for test: {test_name}")
    
    def pytest_sessionfinish(self, session, exitstatus):
        """Called after the entire test session finishes."""
        print("[TIA-Python] Test session completed, processing coverage data")
    
    def save_test_coverage(self, item):
        """Save coverage data for a specific test."""
        try:
            test_name = self.sanitize_test_name(item.name)
            class_name = self.sanitize_class_name(item.cls.__name__ if item.cls else 'NoClass')
            
            # Get coverage data
            coverage_data = self.convert_coverage_to_tia_format()
            
            # Save in TIA format
            filename = f"{class_name}__{test_name}.json"
            filepath = self.per_test_coverage_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(coverage_data, f, indent=2)
            
            print(f"[TIA-Python] Saved coverage: {filename}")
            
        except Exception as e:
            print(f"[TIA-Python] Failed to save coverage for {item.name}: {e}")
    
    def convert_coverage_to_tia_format(self):
        """Convert Python coverage data to TIA-compatible format."""
        if not self.cov:
            return {}
        
        # Get coverage data
        self.cov.save()
        data = self.cov.get_data()
        
        tia_coverage = {}
        
        # Process each file that was measured
        for filename in data.measured_files():
            # Skip test files and other non-source files
            if 'test' in filename or filename.endswith('pytest_tia_plugin.py'):
                continue
            
            # Get relative path
            rel_path = os.path.relpath(filename)
            
            # Get line data for this file
            lines = data.lines(filename) or []
            
            # Get missing lines by analyzing the file
            try:
                # Read the source file to get all possible lines
                with open(filename, 'r') as f:
                    all_lines = list(range(1, len(f.readlines()) + 1))
                missing_lines = [line for line in all_lines if line not in lines]
            except:
                missing_lines = []
                
            # Convert to TIA format (similar to Istanbul coverage)
            file_coverage = self.create_file_coverage(rel_path, lines, missing_lines)
            tia_coverage[rel_path] = file_coverage
        
        return tia_coverage
    
    def create_file_coverage(self, filepath, executed_lines, missing_lines):
        """Create TIA-compatible coverage data for a file."""
        # Read the file to get line count and create statement map
        try:
            with open(filepath, 'r') as f:
                file_lines = f.readlines()
        except:
            file_lines = []
        
        statement_map = {}
        s = {}  # Statement hit counts
        
        # Create statement map for all executable lines
        all_lines = set(executed_lines) | set(missing_lines)
        
        for i, line_num in enumerate(sorted(all_lines)):
            stmt_id = str(i)
            statement_map[stmt_id] = {
                "start": {"line": line_num, "column": 0},
                "end": {"line": line_num, "column": len(file_lines[line_num - 1].rstrip()) if line_num <= len(file_lines) else 0}
            }
            
            # Set hit count (1 if executed, 0 if missing)
            s[stmt_id] = 1 if line_num in executed_lines else 0
        
        return {
            "path": filepath,
            "statementMap": statement_map,
            "fnMap": {},  # Function mapping would require AST parsing
            "branchMap": {},  # Branch mapping would require AST parsing
            "s": s,
            "f": {},
            "b": {},
            "_coverageSchema": "python-coverage-tia-1.0.0"
        }
    
    def sanitize_test_name(self, test_name):
        """Convert test name to a safe filename."""
        # Remove test class prefix and parameters
        name = re.sub(r'^test_', '', test_name)
        name = re.sub(r'\[.*\]$', '', name)  # Remove parametrize brackets
        # Replace special characters with underscores
        return re.sub(r'[^a-zA-Z0-9]', '_', name)
    
    def sanitize_class_name(self, class_name):
        """Convert class name to a safe filename."""
        # Remove Test prefix/suffix
        name = re.sub(r'^Test', '', class_name)
        name = re.sub(r'Test$', '', name)
        # Replace special characters with underscores
        return re.sub(r'[^a-zA-Z0-9]', '_', name)


# Plugin registration
def pytest_configure(config):
    """Register the TIA coverage plugin."""
    if not hasattr(config, '_tia_plugin'):
        config._tia_plugin = TIACoveragePlugin()
        config.pluginmanager.register(config._tia_plugin, 'tia_coverage')

def pytest_runtest_setup(item):
    """Hook for test setup."""
    if hasattr(item.config, '_tia_plugin'):
        item.config._tia_plugin.pytest_runtest_setup(item)

def pytest_runtest_teardown(item, nextitem):
    """Hook for test teardown."""
    if hasattr(item.config, '_tia_plugin'):
        item.config._tia_plugin.pytest_runtest_teardown(item, nextitem)

def pytest_sessionfinish(session, exitstatus):
    """Hook for session finish."""
    if hasattr(session.config, '_tia_plugin'):
        session.config._tia_plugin.pytest_sessionfinish(session, exitstatus)
