package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("Products API", func() {
	var router *gin.Engine
	var recorder *httptest.ResponseRecorder

	BeforeEach(func() {
		router = setupRouter()
		recorder = httptest.NewRecorder()
		
		// Reset products data for each test
		products = []Product{
			{ID: 1, Name: "Laptop", Price: 999.99, Description: "High-performance laptop"},
			{ID: 2, Name: "Mouse", Price: 29.99, Description: "Wireless mouse"},
			{ID: 3, Name: "Keyboard", Price: 79.99, Description: "Mechanical keyboard"},
		}
	})

	Describe("GET /api/products", func() {
		It("should return all products", func() {
			req, _ := http.NewRequest("GET", "/api/products", nil)
			router.ServeHTTP(recorder, req)

			Expect(recorder.Code).To(Equal(http.StatusOK))
			
			var response map[string][]Product
			err := json.Unmarshal(recorder.Body.Bytes(), &response)
			Expect(err).ToNot(HaveOccurred())
			
			Expect(response["products"]).To(HaveLen(3))
			Expect(response["products"][0].Name).To(Equal("Laptop"))
			Expect(response["products"][1].Name).To(Equal("Mouse"))
			Expect(response["products"][2].Name).To(Equal("Keyboard"))
		})
	})

	Describe("GET /api/products/:id", func() {
		Context("when product exists", func() {
			It("should return the product", func() {
				req, _ := http.NewRequest("GET", "/api/products/1", nil)
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusOK))
				
				var product Product
				err := json.Unmarshal(recorder.Body.Bytes(), &product)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(product.ID).To(Equal(1))
				Expect(product.Name).To(Equal("Laptop"))
				Expect(product.Price).To(Equal(999.99))
				Expect(product.Description).To(Equal("High-performance laptop"))
			})
		})

		Context("when product does not exist", func() {
			It("should return 404", func() {
				req, _ := http.NewRequest("GET", "/api/products/999", nil)
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusNotFound))
				
				var response map[string]string
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(response["error"]).To(Equal("Product not found"))
			})
		})

		Context("when invalid product ID is provided", func() {
			It("should return 400", func() {
				req, _ := http.NewRequest("GET", "/api/products/invalid", nil)
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusBadRequest))
				
				var response map[string]string
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(response["error"]).To(Equal("Invalid product ID"))
			})
		})
	})

	Describe("POST /api/products", func() {
		Context("with valid product data", func() {
			It("should create a new product", func() {
				newProduct := Product{
					Name:        "Test Product",
					Price:       99.99,
					Description: "A test product",
				}
				jsonData, _ := json.Marshal(newProduct)
				
				req, _ := http.NewRequest("POST", "/api/products", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusCreated))
				
				var createdProduct Product
				err := json.Unmarshal(recorder.Body.Bytes(), &createdProduct)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(createdProduct.ID).To(Equal(4)) // Should be next available ID
				Expect(createdProduct.Name).To(Equal("Test Product"))
				Expect(createdProduct.Price).To(Equal(99.99))
				Expect(createdProduct.Description).To(Equal("A test product"))
			})
		})

		Context("with invalid product data", func() {
			It("should return 400 for missing fields", func() {
				invalidProduct := map[string]string{"name": "Test Product"} // Missing price
				jsonData, _ := json.Marshal(invalidProduct)
				
				req, _ := http.NewRequest("POST", "/api/products", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusBadRequest))
			})
		})
	})
})
