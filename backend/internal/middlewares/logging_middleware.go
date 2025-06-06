package middlewares

import (
	"net/http"
	"time"

	"github.com/larza79/lumi2025/pkg/logger"
)

// responseWriter is a wrapper around http.ResponseWriter that captures the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Log request start using utility function
		logger.HTTPRequestStart(r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent())

		// Wrap the response writer to capture status code
		rw := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default to 200
		}

		// Call the next handler
		next.ServeHTTP(rw, r)

		duration := time.Since(start)

		// Log request completion using utility function
		logger.HTTPRequestComplete(r.Method, r.URL.Path, duration, rw.statusCode)
	})
}
