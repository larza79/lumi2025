package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/larza79/lumi2025/internal/httpserver"
	"github.com/larza79/lumi2025/internal/settings"
	"github.com/larza79/lumi2025/pkg/logger"
	"go.uber.org/automaxprocs/maxprocs"
	"go.uber.org/zap"
)

func main() {
	// Check for health check flag
	if len(os.Args) > 1 && os.Args[1] == "--health-check" {
		// Perform health check by making HTTP request to health endpoint
		client := &http.Client{Timeout: 3 * time.Second}
		resp, err := client.Get("http://localhost:8888/health")
		if err != nil {
			fmt.Printf("Health check failed: %v\n", err)
			os.Exit(1)
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			fmt.Println("Health check passed")
			os.Exit(0)
		} else {
			fmt.Printf("Health check failed with status: %d\n", resp.StatusCode)
			os.Exit(1)
		}
	}

	// Initialize logger
	if err := logger.InitLogger(true); err != nil { // Set to true for development
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer logger.Sync()

	// Set GOMAXPROCS to match Linux container CPU quota
	undo, maxprocsErr := maxprocs.Set()
	if maxprocsErr != nil {
		logger.Error("Failed to set GOMAXPROCS", zap.Error(maxprocsErr))
	} else {
		logger.Info("GOMAXPROCS set successfully")
	}
	defer undo()

	cancelChan := make(chan os.Signal, 1)

	stop := make(chan struct{})
	// catch SIGETRM or SIGINTERRUPT.
	signal.Notify(cancelChan, syscall.SIGTERM, syscall.SIGINT)
	var err error

	settings.Init()

	logger.Info("Starting Lumi 2025 Backend API")

	// Start the HTTP server
	go func() {
		httpserver.Start()
		sig := <-cancelChan
		_, _ = fmt.Println()
		_, _ = fmt.Println(sig)
		stop <- struct{}{}
	}()

	logger.Info("Lumi 2025 Backend API started successfully",
		zap.String("version", settings.Version),
		zap.String("commit", settings.Commit),
		zap.String("port", "8888"),
		zap.String("host", "localhost"),
	)
	// Wait for shutdown signal
	<-stop
	logger.Info("Shutting down Lumi 2025 Backend API gracefully",
		zap.String("version", settings.Version),
		zap.String("commit", settings.Commit),
		zap.String("port", "8888"),
		zap.String("host", "localhost"),
	)
	if err != nil {
		logger.Error("Error during shutdown",
			zap.Error(err),
			zap.String("version", settings.Version),
			zap.String("commit", settings.Commit),
		)
	} else {
		logger.Info("Lumi 2025 Backend API shutdown complete",
			zap.String("version", settings.Version),
			zap.String("commit", settings.Commit),
		)
	}
}
