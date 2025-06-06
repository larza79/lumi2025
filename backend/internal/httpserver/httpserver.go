package httpserver

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/larza79/lumi2025/internal/routes"
	"github.com/larza79/lumi2025/pkg/consts"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

func Start() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer logger.Sync()

	router := mux.NewRouter()
	// Setup routes with logger
	routes.SetupRoutes(router, logger)

	host := "localhost"
	if viper.GetBool(consts.DEVELOPMENT) {
		logger.Info("Running in development mode")
		// For development, use a more readable logger
		devLogger, _ := zap.NewDevelopment()
		logger = devLogger
	} else {
		logger.Info("Running in production mode")
		host = ""
	}

	port := "8888"
	url := fmt.Sprintf("%s:%s", host, port)
	server := &http.Server{
		Handler:      router,
		Addr:         url,
		ReadTimeout:  20 * time.Second, // Changed from Millisecond to Second
		WriteTimeout: 20 * time.Second, // Changed from Millisecond to Second
	}

	logger.Info("Starting HTTP server",
		zap.String("address", url),
		zap.String("port", port),
		zap.Bool("development", viper.GetBool(consts.DEVELOPMENT)),
	)

	if err := server.ListenAndServe(); err != nil {
		logger.Fatal("HTTP server failed to start", zap.Error(err))
	}
}
