package main_test

import (
	"bytes"
	"encoding/json"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

const baseURL = "http://localhost:8080"

var _ = Describe("Go Backend Per-Test E2E Tests", func() {
	// Note: TIA per-test hooks need to be set up in the main package
	// For now, we'll run tests that expect per-test coverage collection

	Describe("Health API", func() {
		It("should return healthy status", func() {
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
			resp, err := http.Get(baseURL + "/api/users/invalid")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Invalid user identifier"))
		})

		It("should return user by valid ID", func() {
			resp, err := http.Get(baseURL + "/api/users/1")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var result map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			user := result["user"].(map[string]interface{})
			Expect(user["name"]).To(Equal("John Doe"))
		})

		It("should create a new user", func() {
			newUser := map[string]interface{}{
				"name":  "Alice Johnson",
				"email": "alice@example.com",
			}
			jsonData, _ := json.Marshal(newUser)

			resp, err := http.Post(baseURL+"/api/users", "application/json", bytes.NewBuffer(jsonData))
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusCreated))

			var result map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			user := result["user"].(map[string]interface{})
			Expect(user["name"]).To(Equal("Alice Johnson"))
		})
	})

	Describe("Products API", func() {
		It("should return all products", func() {
			resp, err := http.Get(baseURL + "/api/products")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var result map[string][]map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["products"]).To(HaveLen(3))
		})

		It("should return 404 for non-existent product", func() {
			resp, err := http.Get(baseURL + "/api/products/999")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNotFound))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Product not found"))
		})
	})
})
