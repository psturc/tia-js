package main_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

const baseURL = "http://localhost:8080"

var _ = Describe("Go Backend Per-Test E2E Tests", func() {
	var (
		appCmd    *exec.Cmd
		appPID    int
		coverageDir string
	)

	// Helper function to start the application with coverage
	startApp := func(testName string) {
		// Create unique coverage directory for this test
		coverageDir = filepath.Join(".tia", "per-test-coverage-raw", testName)
		err := os.MkdirAll(coverageDir, 0755)
		Expect(err).ToNot(HaveOccurred())

		// Build the application with coverage
		buildCmd := exec.Command("go", "build", "-cover", "-covermode=atomic", "-o", "main_test_binary", "main.go")
		err = buildCmd.Run()
		Expect(err).ToNot(HaveOccurred())

		// Start the application with coverage
		appCmd = exec.Command("./main_test_binary")
		appCmd.Env = append(os.Environ(), "GOCOVERDIR="+coverageDir)
		
		err = appCmd.Start()
		Expect(err).ToNot(HaveOccurred())
		
		appPID = appCmd.Process.Pid
		fmt.Printf("[TIA-Go] Started app for test '%s' with PID: %d\n", testName, appPID)

		// Wait for the application to be ready
		Eventually(func() error {
			resp, err := http.Get(baseURL + "/api/health")
			if err != nil {
				return err
			}
			resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				return fmt.Errorf("app not ready, status: %d", resp.StatusCode)
			}
			return nil
		}, 10*time.Second, 100*time.Millisecond).Should(Succeed())

		fmt.Printf("[TIA-Go] App ready for test '%s'\n", testName)
	}

	// Helper function to stop the application and collect coverage
	stopApp := func(testName string) {
		if appCmd != nil && appCmd.Process != nil {
			fmt.Printf("[TIA-Go] Stopping app for test '%s' (PID: %d)\n", testName, appPID)
			
			// Send SIGTERM for graceful shutdown
			err := appCmd.Process.Signal(syscall.SIGTERM)
			if err != nil {
				fmt.Printf("[TIA-Go] Error sending SIGTERM: %v\n", err)
			}

			// Wait for process to exit
			done := make(chan error, 1)
			go func() {
				done <- appCmd.Wait()
			}()

			select {
			case err := <-done:
				if err != nil {
					fmt.Printf("[TIA-Go] App exited with error: %v\n", err)
				} else {
					fmt.Printf("[TIA-Go] App exited gracefully for test '%s'\n", testName)
				}
			case <-time.After(5 * time.Second):
				fmt.Printf("[TIA-Go] Timeout waiting for graceful shutdown, killing process\n")
				appCmd.Process.Kill()
				<-done
			}

			// Convert coverage data to TIA format
			convertCoverageToTIA(testName, coverageDir)
		}

		// Clean up binary
		os.Remove("main_test_binary")
	}

	// Helper function to convert Go coverage to TIA format
	convertCoverageToTIA := func(testName, coverageDir string) {
		// Check if coverage data exists
		if _, err := os.Stat(coverageDir); os.IsNotExist(err) {
			fmt.Printf("[TIA-Go] No coverage directory for test '%s'\n", testName)
			return
		}

		files, err := os.ReadDir(coverageDir)
		if err != nil || len(files) == 0 {
			fmt.Printf("[TIA-Go] No coverage files for test '%s'\n", testName)
			return
		}

		// Convert coverage data using go tool covdata
		tempCoverageFile := fmt.Sprintf("temp_coverage_%s.out", testName)
		cmd := exec.Command("go", "tool", "covdata", "textfmt", "-i="+coverageDir, "-o="+tempCoverageFile)
		err = cmd.Run()
		if err != nil {
			fmt.Printf("[TIA-Go] Failed to convert coverage for test '%s': %v\n", testName, err)
			return
		}

		// Here we would normally convert to TIA JSON format
		// For now, just move the coverage file to the expected location
		finalCoverageFile := filepath.Join(".tia", "per-test-coverage", fmt.Sprintf("Per_Test_E2E__%s.json", testName))
		
		// Create a simple TIA-format coverage file (this is a simplified version)
		// In a real implementation, you'd parse the Go coverage format and convert it properly
		coverageData := map[string]interface{}{
			"main.go": map[string]interface{}{
				"_coverageSchema": "go-coverage-tia-1.0.0",
				"path": "main.go",
				"s": map[string]int{}, // This would be populated from actual coverage data
				"statementMap": map[string]interface{}{},
				"f": map[string]int{},
				"fnMap": map[string]interface{}{},
				"b": map[string]interface{}{},
				"branchMap": map[string]interface{}{},
			},
		}

		// Write the coverage data
		os.MkdirAll(filepath.Dir(finalCoverageFile), 0755)
		file, err := os.Create(finalCoverageFile)
		if err == nil {
			encoder := json.NewEncoder(file)
			encoder.SetIndent("", "  ")
			encoder.Encode(coverageData)
			file.Close()
			fmt.Printf("[TIA-Go] Saved coverage for test '%s'\n", testName)
		}

		// Clean up temp file
		os.Remove(tempCoverageFile)
	}

	Describe("Health API", func() {
		It("should return healthy status", func() {
			testName := "Health_API_should_return_healthy_status"
			startApp(testName)
			defer stopApp(testName)

			resp, err := http.Get(baseURL + "/api/health")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["status"]).To(Equal("healthy"))
			Expect(result["version"]).To(Equal("1.0.0"))
		})
	})

	Describe("Users API", func() {
		It("should return all users", func() {
			testName := "Users_API_should_return_all_users"
			startApp(testName)
			defer stopApp(testName)

			resp, err := http.Get(baseURL + "/api/users")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var result map[string][]map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["users"]).To(HaveLen(2))
			Expect(result["users"][0]["name"]).To(Equal("John Doe"))
			Expect(result["users"][1]["name"]).To(Equal("Jane Smith"))
		})

		It("should return 400 for invalid user ID", func() {
			testName := "Users_API_should_return_400_for_invalid_user_ID"
			startApp(testName)
			defer stopApp(testName)

			resp, err := http.Get(baseURL + "/api/users/invalid")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Invalid user identifier"))
		})
	})

	Describe("Products API", func() {
		It("should return all products", func() {
			testName := "Products_API_should_return_all_products"
			startApp(testName)
			defer stopApp(testName)

			resp, err := http.Get(baseURL + "/api/products")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var result map[string][]map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["products"]).To(HaveLen(3))
		})
	})
})


