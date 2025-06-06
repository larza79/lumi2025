package routes

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/larza79/lumi2025/internal/handlers/healthhandler"
	"go.uber.org/zap"
)

// SetupRoutes configures all the routes for the application
func SetupRoutes(router *mux.Router, logger *zap.Logger) {
	// Health check endpoint
	router.HandleFunc("/health", healthhandler.HealthHandler(logger)).Methods("GET")

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/status", statusHandler(logger)).Methods("GET")
	api.HandleFunc("/hello", helloHandler(logger)).Methods("GET")
}

func statusHandler(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Info("Status endpoint requested",
			zap.String("user_agent", r.UserAgent()),
			zap.String("method", r.Method),
		)

		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"message": "Lumi 2025 Backend API",
			"version": "1.0.0",
			"status":  "running",
		}

		json.NewEncoder(w).Encode(response)
	}
}

func helloHandler(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("name")
		if name == "" {
			name = "World"
		}

		logger.Info("Hello endpoint requested",
			zap.String("name", name),
			zap.String("ip", r.RemoteAddr),
		)

		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"message":   "Hello, " + name + "!",
			"timestamp": "2025-06-06T00:00:00Z",
		}

		json.NewEncoder(w).Encode(response)
	}
}
