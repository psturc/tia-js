package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("Health API", func() {
	var router *gin.Engine
	var recorder *httptest.ResponseRecorder

	BeforeEach(func() {
		router = setupRouter()
		recorder = httptest.NewRecorder()
	})

	Describe("GET /api/health", func() {
		It("should return healthy status", func() {
			req, _ := http.NewRequest("GET", "/api/health", nil)
			router.ServeHTTP(recorder, req)

			Expect(recorder.Code).To(Equal(http.StatusOK))
			
			var response map[string]string
			err := json.Unmarshal(recorder.Body.Bytes(), &response)
			Expect(err).ToNot(HaveOccurred())
			
			Expect(response["status"]).To(Equal("healthy"))
			Expect(response["version"]).To(Equal("1.0.0"))
		})
	})
})
