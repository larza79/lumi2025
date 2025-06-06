# Makefile for the project
# inspired by kubebuilder.io

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

##@ Help
.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Golang 
.PHONY: go-build
go-build: ## Build the Go application.
	go build -o bin/api ./cmd/api/main.go

.PHONY: go-test
go-test: ## Run tests for the Go application.
	go test ./... -v

.PHONY: go-fmt
go-fmt: ## Format Go code.
	go fmt ./...

.PHONY: go-lint
go-lint: ## Run linter on Go code.
	golangci-lint run ./...

.PHONY: go-vet
go-vet: ## Run go vet on the code.
	go vet ./...

##@ Golang Dependencies
.PHONY: deps update-deps
deps: ## Download and verify dependencies
	@echo "Downloading dependencies..."
	@go mod download
	@go mod verify
	@go mod tidy
	@echo "Dependencies updated!"

update-deps: ## Update dependencies
	@echo "Updating dependencies..."
	@go get -u ./...
	@go mod tidy