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

var _ = Describe("Users API", func() {
	var router *gin.Engine
	var recorder *httptest.ResponseRecorder

	BeforeEach(func() {
		router = setupRouter()
		recorder = httptest.NewRecorder()
		
		// Reset users data for each test
		users = []User{
			{ID: 1, Name: "John Doe", Email: "john@example.com"},
			{ID: 2, Name: "Jane Smith", Email: "jane@example.com"},
		}
	})

	Describe("GET /api/users", func() {
		It("should return all users", func() {
			req, _ := http.NewRequest("GET", "/api/users", nil)
			router.ServeHTTP(recorder, req)

			Expect(recorder.Code).To(Equal(http.StatusOK))
			
			var response map[string][]User
			err := json.Unmarshal(recorder.Body.Bytes(), &response)
			Expect(err).ToNot(HaveOccurred())
			
			Expect(response["users"]).To(HaveLen(2))
			Expect(response["users"][0].Name).To(Equal("John Doe"))
			Expect(response["users"][1].Name).To(Equal("Jane Smith"))
		})
	})

	Describe("GET /api/users/:id", func() {
		Context("when user exists", func() {
			It("should return the user", func() {
				req, _ := http.NewRequest("GET", "/api/users/1", nil)
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusOK))
				
				var user User
				err := json.Unmarshal(recorder.Body.Bytes(), &user)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(user.ID).To(Equal(1))
				Expect(user.Name).To(Equal("John Doe"))
				Expect(user.Email).To(Equal("john@example.com"))
			})
		})

		Context("when user does not exist", func() {
			It("should return 404", func() {
				req, _ := http.NewRequest("GET", "/api/users/999", nil)
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusNotFound))
				
				var response map[string]string
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(response["error"]).To(Equal("User not found"))
			})
		})

		Context("when invalid user ID is provided", func() {
			It("should return 400", func() {
				req, _ := http.NewRequest("GET", "/api/users/invalid", nil)
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusBadRequest))
				
				var response map[string]string
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(response["error"]).To(Equal("Invalid user ID"))
			})
		})
	})

	Describe("POST /api/users", func() {
		Context("with valid user data", func() {
			It("should create a new user", func() {
				newUser := User{Name: "Test User", Email: "test@example.com"}
				jsonData, _ := json.Marshal(newUser)
				
				req, _ := http.NewRequest("POST", "/api/users", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusCreated))
				
				var createdUser User
				err := json.Unmarshal(recorder.Body.Bytes(), &createdUser)
				Expect(err).ToNot(HaveOccurred())
				
				Expect(createdUser.ID).To(Equal(3)) // Should be next available ID
				Expect(createdUser.Name).To(Equal("Test User"))
				Expect(createdUser.Email).To(Equal("test@example.com"))
			})
		})

		Context("with invalid user data", func() {
			It("should return 400 for missing fields", func() {
				invalidUser := map[string]string{"name": "Test User"} // Missing email
				jsonData, _ := json.Marshal(invalidUser)
				
				req, _ := http.NewRequest("POST", "/api/users", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(recorder, req)

				Expect(recorder.Code).To(Equal(http.StatusBadRequest))
			})
		})
	})
})
