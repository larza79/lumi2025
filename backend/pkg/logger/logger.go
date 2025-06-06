package logger

import (
	"time"

	"go.uber.org/zap"
)

var (
	// Global logger instance
	Logger *zap.Logger
)

// InitLogger initializes the global logger based on environment
func InitLogger(development bool) error {
	var err error

	if development {
		// Development logger with pretty printing
		Logger, err = zap.NewDevelopment()
	} else {
		// Production logger with JSON format
		Logger, err = zap.NewProduction()
	}

	if err != nil {
		return err
	}

	return nil
}

// GetLogger returns the global logger instance
func GetLogger() *zap.Logger {
	if Logger == nil {
		// Fallback to a default logger if not initialized
		Logger, _ = zap.NewProduction()
	}
	return Logger
}

// Sync flushes any buffered log entries
func Sync() {
	if Logger != nil {
		Logger.Sync()
	}
}

// Info logs an info message
func Info(msg string, fields ...zap.Field) {
	GetLogger().Info(msg, fields...)
}

// Error logs an error message
func Error(msg string, fields ...zap.Field) {
	GetLogger().Error(msg, fields...)
}

// Debug logs a debug message
func Debug(msg string, fields ...zap.Field) {
	GetLogger().Debug(msg, fields...)
}

// Warn logs a warning message
func Warn(msg string, fields ...zap.Field) {
	GetLogger().Warn(msg, fields...)
}

// Fatal logs a fatal message and exits
func Fatal(msg string, fields ...zap.Field) {
	GetLogger().Fatal(msg, fields...)
}

// HTTPRequestStart logs the start of an HTTP request
func HTTPRequestStart(method, path, remoteAddr, userAgent string) {
	Info("HTTP request started",
		zap.String("method", method),
		zap.String("path", path),
		zap.String("remote_addr", remoteAddr),
		zap.String("user_agent", userAgent),
	)
}

// HTTPRequestComplete logs the completion of an HTTP request
func HTTPRequestComplete(method, path string, duration time.Duration, statusCode int) {
	Info("HTTP request completed",
		zap.String("method", method),
		zap.String("path", path),
		zap.Duration("duration", duration),
		zap.Int("status_code", statusCode),
	)
}
