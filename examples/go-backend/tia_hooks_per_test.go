package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	. "github.com/onsi/ginkgo/v2"
)

// TIAPerTestCoverageCollector handles per-test coverage collection
type TIAPerTestCoverageCollector struct {
	perTestCoverageDir string
	appCmd             *exec.Cmd
	appPID             int
	currentTestName    string
	coverageDir        string
}

// NewTIAPerTestCoverageCollector creates a new per-test coverage collector
func NewTIAPerTestCoverageCollector() *TIAPerTestCoverageCollector {
	return &TIAPerTestCoverageCollector{
		perTestCoverageDir: filepath.Join(".", ".tia", "per-test-coverage"),
	}
}

// SetupTIAPerTestHooks sets up the TIA per-test coverage collection hooks
func SetupTIAPerTestHooks() {
	collector := NewTIAPerTestCoverageCollector()

	BeforeSuite(func() {
		// Ensure the coverage directory exists
		if err := os.MkdirAll(collector.perTestCoverageDir, 0755); err != nil {
			fmt.Printf("[TIA-Go Per-Test] Failed to create coverage directory: %v\n", err)
		}
		
		// Build the application with coverage instrumentation
		fmt.Println("[TIA-Go Per-Test] Building application with coverage instrumentation...")
		buildCmd := exec.Command("go", "build", "-cover", "-covermode=atomic", "-o", "main_per_test_binary", "main.go")
		if err := buildCmd.Run(); err != nil {
			fmt.Printf("[TIA-Go Per-Test] Failed to build application: %v\n", err)
			return
		}
		
		fmt.Println("[TIA-Go Per-Test] Starting per-test coverage collection")
	})

	BeforeEach(func() {
		// Start application for this specific test
		collector.startAppForTest()
	})

	AfterEach(func() {
		// Stop application and collect coverage for this test
		collector.stopAppAndCollectCoverage()
	})

	AfterSuite(func() {
		// Clean up the test binary
		os.Remove("main_per_test_binary")
		fmt.Println("[TIA-Go Per-Test] Per-test coverage collection completed")
	})
}

// startAppForTest starts the application for the current test
func (c *TIAPerTestCoverageCollector) startAppForTest() {
	// Get current test name
	c.currentTestName = c.getCurrentTestName()
	
	// Create unique coverage directory for this test
	c.coverageDir = filepath.Join(".", ".tia", "per-test-coverage-raw", c.currentTestName)
	if err := os.MkdirAll(c.coverageDir, 0755); err != nil {
		fmt.Printf("[TIA-Go Per-Test] Failed to create coverage dir for test '%s': %v\n", c.currentTestName, err)
		return
	}

	// Start the application with coverage
	c.appCmd = exec.Command("./main_per_test_binary")
	c.appCmd.Env = append(os.Environ(), "GOCOVERDIR="+c.coverageDir)
	
	if err := c.appCmd.Start(); err != nil {
		fmt.Printf("[TIA-Go Per-Test] Failed to start app for test '%s': %v\n", c.currentTestName, err)
		return
	}
	
	c.appPID = c.appCmd.Process.Pid
	fmt.Printf("[TIA-Go Per-Test] Started app for test '%s' with PID: %d\n", c.currentTestName, c.appPID)

	// Wait for the application to be ready
	c.waitForAppReady()
}

// stopAppAndCollectCoverage stops the application and collects coverage
func (c *TIAPerTestCoverageCollector) stopAppAndCollectCoverage() {
	if c.appCmd == nil || c.appCmd.Process == nil {
		return
	}

	fmt.Printf("[TIA-Go Per-Test] Stopping app for test '%s' (PID: %d)\n", c.currentTestName, c.appPID)
	
	// Send SIGTERM for graceful shutdown
	if err := c.appCmd.Process.Signal(syscall.SIGTERM); err != nil {
		fmt.Printf("[TIA-Go Per-Test] Error sending SIGTERM: %v\n", err)
	}

	// Wait for process to exit with timeout
	done := make(chan error, 1)
	go func() {
		done <- c.appCmd.Wait()
	}()

	select {
	case err := <-done:
		if err != nil {
			fmt.Printf("[TIA-Go Per-Test] App exited with error: %v\n", err)
		} else {
			fmt.Printf("[TIA-Go Per-Test] App exited gracefully for test '%s'\n", c.currentTestName)
		}
	case <-time.After(5 * time.Second):
		fmt.Printf("[TIA-Go Per-Test] Timeout waiting for graceful shutdown, killing process\n")
		c.appCmd.Process.Kill()
		<-done
	}

	// Convert coverage data to TIA format
	c.convertCoverageToTIA()
}

// waitForAppReady waits for the application to be ready
func (c *TIAPerTestCoverageCollector) waitForAppReady() {
	for i := 0; i < 30; i++ {
		resp, err := http.Get("http://localhost:8080/api/health")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				fmt.Printf("[TIA-Go Per-Test] App ready for test '%s'\n", c.currentTestName)
				return
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	fmt.Printf("[TIA-Go Per-Test] Warning: App may not be ready for test '%s'\n", c.currentTestName)
}

// getCurrentTestName gets the current test name from Ginkgo
func (c *TIAPerTestCoverageCollector) getCurrentTestName() string {
	// Get the current spec report
	report := CurrentSpecReport()
	
	// Create a clean test name for file naming
	testName := strings.ReplaceAll(report.FullText(), " ", "_")
	testName = strings.ReplaceAll(testName, "/", "_")
	testName = strings.ReplaceAll(testName, "\\", "_")
	testName = regexp.MustCompile(`[^a-zA-Z0-9_]`).ReplaceAllString(testName, "_")
	
	return testName
}

// convertCoverageToTIA converts Go coverage data to TIA JSON format
func (c *TIAPerTestCoverageCollector) convertCoverageToTIA() {
	// Check if coverage data exists
	if _, err := os.Stat(c.coverageDir); os.IsNotExist(err) {
		fmt.Printf("[TIA-Go Per-Test] No coverage directory for test '%s'\n", c.currentTestName)
		return
	}

	files, err := os.ReadDir(c.coverageDir)
	if err != nil || len(files) == 0 {
		fmt.Printf("[TIA-Go Per-Test] No coverage files for test '%s'\n", c.currentTestName)
		return
	}

	// Convert coverage data using go tool covdata
	tempCoverageFile := fmt.Sprintf("temp_coverage_%s.out", c.currentTestName)
	cmd := exec.Command("go", "tool", "covdata", "textfmt", "-i="+c.coverageDir, "-o="+tempCoverageFile)
	if err := cmd.Run(); err != nil {
		fmt.Printf("[TIA-Go Per-Test] Failed to convert coverage for test '%s': %v\n", c.currentTestName, err)
		return
	}

	// Convert to TIA JSON format
	c.convertGoProfileToTIAJSON(tempCoverageFile)

	// Clean up temp file
	os.Remove(tempCoverageFile)
	
	// Clean up raw coverage directory
	os.RemoveAll(c.coverageDir)
}

// convertGoProfileToTIAJSON converts Go coverage profile to TIA JSON format
func (c *TIAPerTestCoverageCollector) convertGoProfileToTIAJSON(profileFile string) {
	// Parse the coverage profile
	profiles, err := c.parseProfile(profileFile)
	if err != nil {
		fmt.Printf("[TIA-Go Per-Test] Failed to parse coverage profile: %v\n", err)
		return
	}

	// Convert to TIA format for each file
	for fileName, profile := range profiles {
		tiaData := c.convertProfileToTIA(fileName, profile)
		
		// Save TIA coverage file
		tiaFileName := fmt.Sprintf("Per_Test_E2E__%s.json", c.currentTestName)
		tiaFilePath := filepath.Join(c.perTestCoverageDir, tiaFileName)
		
		if err := c.saveTIAFile(tiaFilePath, tiaData); err != nil {
			fmt.Printf("[TIA-Go Per-Test] Failed to save TIA file: %v\n", err)
		} else {
			fmt.Printf("[TIA-Go Per-Test] Saved coverage for test '%s'\n", c.currentTestName)
		}
	}
}

// Profile represents a coverage profile for a file
type Profile struct {
	FileName string
	Blocks   []ProfileBlock
}

// ProfileBlock represents a coverage block
type ProfileBlock struct {
	StartLine, StartCol int
	EndLine, EndCol     int
	NumStmt, Count      int
}

// parseProfile parses a Go coverage profile
func (c *TIAPerTestCoverageCollector) parseProfile(filename string) (map[string]*Profile, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	profiles := make(map[string]*Profile)
	scanner := bufio.NewScanner(file)
	
	// Skip the mode line
	if scanner.Scan() {
		// mode line
	}

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		// Parse line: filename:startLine.startCol,endLine.endCol numStmt count
		parts := strings.Fields(line)
		if len(parts) != 3 {
			continue
		}

		// Extract filename and position
		colonIdx := strings.LastIndex(parts[0], ":")
		if colonIdx == -1 {
			continue
		}
		
		fileName := parts[0][:colonIdx]
		position := parts[0][colonIdx+1:]
		
		// Parse position: startLine.startCol,endLine.endCol
		commaSplit := strings.Split(position, ",")
		if len(commaSplit) != 2 {
			continue
		}
		
		startParts := strings.Split(commaSplit[0], ".")
		endParts := strings.Split(commaSplit[1], ".")
		if len(startParts) != 2 || len(endParts) != 2 {
			continue
		}
		
		startLine, _ := strconv.Atoi(startParts[0])
		startCol, _ := strconv.Atoi(startParts[1])
		endLine, _ := strconv.Atoi(endParts[0])
		endCol, _ := strconv.Atoi(endParts[1])
		numStmt, _ := strconv.Atoi(parts[1])
		count, _ := strconv.Atoi(parts[2])

		if profiles[fileName] == nil {
			profiles[fileName] = &Profile{
				FileName: fileName,
				Blocks:   []ProfileBlock{},
			}
		}

		profiles[fileName].Blocks = append(profiles[fileName].Blocks, ProfileBlock{
			StartLine: startLine,
			StartCol:  startCol,
			EndLine:   endLine,
			EndCol:    endCol,
			NumStmt:   numStmt,
			Count:     count,
		})
	}

	return profiles, scanner.Err()
}

// convertProfileToTIA converts a Go profile to TIA format
func (c *TIAPerTestCoverageCollector) convertProfileToTIA(fileName string, profile *Profile) map[string]interface{} {
	// Get the source file to create statement map
	sourceLines, err := c.getSourceLines(fileName)
	if err != nil {
		fmt.Printf("[TIA-Go Per-Test] Failed to read source file %s: %v\n", fileName, err)
		sourceLines = []string{}
	}

	statementMap := make(map[string]interface{})
	statements := make(map[string]int)
	
	// Convert coverage blocks to TIA statement format
	for i, block := range profile.Blocks {
		stmtID := strconv.Itoa(i)
		
		// Create statement map entry
		statementMap[stmtID] = map[string]interface{}{
			"start": map[string]int{"line": block.StartLine, "column": block.StartCol},
			"end":   map[string]int{"line": block.EndLine, "column": block.EndCol},
		}
		
		// Set statement count
		statements[stmtID] = block.Count
	}

	// Create TIA format
	return map[string]interface{}{
		filepath.Base(fileName): map[string]interface{}{
			"_coverageSchema": "go-coverage-tia-1.0.0",
			"path":           fileName,
			"statementMap":   statementMap,
			"s":              statements,
			"f":              map[string]int{},    // Functions (not implemented)
			"fnMap":          map[string]interface{}{}, // Function map (not implemented)
			"b":              map[string]interface{}{}, // Branches (not implemented)
			"branchMap":      map[string]interface{}{}, // Branch map (not implemented)
		},
	}
}

// getSourceLines reads the source file and returns lines
func (c *TIAPerTestCoverageCollector) getSourceLines(fileName string) ([]string, error) {
	file, err := os.Open(fileName)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	
	return lines, scanner.Err()
}

// saveTIAFile saves the TIA coverage data to a JSON file
func (c *TIAPerTestCoverageCollector) saveTIAFile(filePath string, data map[string]interface{}) error {
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}

