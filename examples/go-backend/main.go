package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

// User represents a user in our system
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Product represents a product in our system
type Product struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
}

// Global data stores (in-memory for simplicity)
var users = []User{
	{ID: 1, Name: "John Doe", Email: "john@example.com"},
	{ID: 2, Name: "Jane Smith", Email: "jane@example.com"},
}

var products = []Product{
	{ID: 1, Name: "Laptop", Price: 999.99, Description: "High-performance laptop"},
	{ID: 2, Name: "Mouse", Price: 29.99, Description: "Wireless mouse"},
	{ID: 3, Name: "Keyboard", Price: 79.99, Description: "Mechanical keyboard"},
}

func main() {
	r := setupRouter()

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}

func setupRouter() *gin.Engine {
	r := gin.Default()

	// API Routes
	r.GET("/api/users", getUsers)
	r.GET("/api/users/:id", getUserByID)
	r.POST("/api/users", createUser)
	r.GET("/api/products", getProducts)
	r.GET("/api/products/:id", getProductByID)
	r.POST("/api/products", createProduct)
	r.GET("/api/health", healthCheck)

	return r
}

func getUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func getUserByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	for _, user := range users {
		if user.ID == id {
			c.JSON(http.StatusOK, user)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
}

func createUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate required fields
	if newUser.Name == "" || newUser.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and email are required"})
		return
	}

	// Generate new ID
	newUser.ID = len(users) + 1
	users = append(users, newUser)

	c.JSON(http.StatusCreated, newUser)
}

func getProducts(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"products": products})
}

func getProductByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	for _, product := range products {
		if product.ID == id {
			c.JSON(http.StatusOK, product)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
}

func createProduct(c *gin.Context) {
	var newProduct Product
	if err := c.ShouldBindJSON(&newProduct); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate required fields
	if newProduct.Name == "" || newProduct.Price == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and price are required"})
		return
	}

	// Generate new ID
	newProduct.ID = len(products) + 1
	products = append(products, newProduct)

	c.JSON(http.StatusCreated, newProduct)
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"version": "1.0.0",
	})
}
