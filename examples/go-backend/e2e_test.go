package main_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

const baseURL = "http://localhost:8080"

var _ = Describe("Go Backend E2E Tests", func() {
	BeforeEach(func() {
		// Wait a bit to ensure server is ready
		time.Sleep(100 * time.Millisecond)
	})

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

		It("should return a specific user", func() {
			resp, err := http.Get(baseURL + "/api/users/1")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var user map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&user)
			Expect(err).ToNot(HaveOccurred())

			Expect(user["id"]).To(Equal(float64(1)))
			Expect(user["name"]).To(Equal("John Doe"))
			Expect(user["email"]).To(Equal("john@example.com"))
		})

		It("should return 404 for non-existent user", func() {
			resp, err := http.Get(baseURL + "/api/users/999")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNotFound))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("User not found"))
		})

		It("should return 400 for invalid user ID", func() {
			resp, err := http.Get(baseURL + "/api/users/invalid")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Invalid user ID"))
		})

		It("should create a new user", func() {
			newUser := map[string]string{
				"name":  "Test User",
				"email": "test@example.com",
			}

			jsonData, err := json.Marshal(newUser)
			Expect(err).ToNot(HaveOccurred())

			resp, err := http.Post(baseURL+"/api/users", "application/json", bytes.NewBuffer(jsonData))
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusCreated))

			var createdUser map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&createdUser)
			Expect(err).ToNot(HaveOccurred())

			Expect(createdUser["name"]).To(Equal("Test User"))
			Expect(createdUser["email"]).To(Equal("test@example.com"))
			Expect(createdUser["id"]).To(BeNumerically(">", 0))
		})

		It("should return 400 for invalid user data", func() {
			invalidUser := map[string]string{
				"name": "Test User",
				// Missing email
			}

			jsonData, err := json.Marshal(invalidUser)
			Expect(err).ToNot(HaveOccurred())

			resp, err := http.Post(baseURL+"/api/users", "application/json", bytes.NewBuffer(jsonData))
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Name and email are required"))
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
			Expect(result["products"][0]["name"]).To(Equal("Laptop"))
			Expect(result["products"][1]["name"]).To(Equal("Mouse"))
			Expect(result["products"][2]["name"]).To(Equal("Keyboard"))
		})

		It("should return a specific product", func() {
			resp, err := http.Get(baseURL + "/api/products/1")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var product map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&product)
			Expect(err).ToNot(HaveOccurred())

			Expect(product["id"]).To(Equal(float64(1)))
			Expect(product["name"]).To(Equal("Laptop"))
			Expect(product["price"]).To(Equal(999.99))
			Expect(product["description"]).To(Equal("High-performance laptop"))
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

		It("should return 400 for invalid product ID", func() {
			resp, err := http.Get(baseURL + "/api/products/invalid")
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Invalid product ID"))
		})

		It("should create a new product", func() {
			newProduct := map[string]interface{}{
				"name":        "Test Product",
				"price":       99.99,
				"description": "A test product",
			}

			jsonData, err := json.Marshal(newProduct)
			Expect(err).ToNot(HaveOccurred())

			resp, err := http.Post(baseURL+"/api/products", "application/json", bytes.NewBuffer(jsonData))
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusCreated))

			var createdProduct map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&createdProduct)
			Expect(err).ToNot(HaveOccurred())

			Expect(createdProduct["name"]).To(Equal("Test Product"))
			Expect(createdProduct["price"]).To(Equal(99.99))
			Expect(createdProduct["description"]).To(Equal("A test product"))
			Expect(createdProduct["id"]).To(BeNumerically(">", 0))
		})

		It("should return 400 for invalid product data", func() {
			invalidProduct := map[string]interface{}{
				"name": "Test Product",
				// Missing price
			}

			jsonData, err := json.Marshal(invalidProduct)
			Expect(err).ToNot(HaveOccurred())

			resp, err := http.Post(baseURL+"/api/products", "application/json", bytes.NewBuffer(jsonData))
			Expect(err).ToNot(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

			var result map[string]string
			err = json.NewDecoder(resp.Body).Decode(&result)
			Expect(err).ToNot(HaveOccurred())

			Expect(result["error"]).To(Equal("Name and price are required"))
		})
	})
})
