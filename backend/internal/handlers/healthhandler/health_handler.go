package healthhandler

import (
	"net/http"

	"github.com/larza79/lumi2025/pkg/helpers/httphelpers"
	"go.uber.org/zap"
)

func HealthHandler(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Info("Health check requested",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.String("remote_addr", r.RemoteAddr),
		)

		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"status":  "healthy",
			"service": "lumi2025-backend",
		}

		httphelpers.RespondWithJSON(w, http.StatusOK, response)
		logger.Info("Health check response sent",
			zap.String("status", "success"),
			zap.String("service", "lumi2025-backend"),
			zap.String("response_status", "healthy"),
			zap.String("response_service", "lumi2025-backend"),
		)

	}
}
