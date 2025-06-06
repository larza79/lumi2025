# Makefile for the project
# inspired by kubebuilder.io

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

DOCKER_ORG = larza79
PROJECTNAME = lumi
VERSION = $(shell git describe --tags --always --dirty)

##@ Help
.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Docker 
.PHONY: docker-build
docker-build: ## Build the Docker image.
	docker build -t $(DOCKER_ORG)/$(PROJECTNAME):$(VERSION) .

.PHONY: docker-push
docker-push: ## Push the Docker image to the registry.
	docker push $(DOCKER_ORG)/$(PROJECTNAME):$(VERSION)

.PHONY: docker-run
docker-run: docker-build ## Run the Docker image locally.
	docker run -p 8080:8080 $(DOCKER_ORG)/$(PROJECTNAME):$(VERSION)

##@ Docker Compose
.PHONY: compose-up
compose-up: ## Start all services with Docker Compose in production mode.
	docker-compose up -d

.PHONY: compose-dev
compose-dev: ## Start all services with Docker Compose in development mode.
	docker-compose -f docker-compose.dev.yml up -d

.PHONY: compose-build
compose-build: ## Build all Docker Compose services.
	docker-compose build

.PHONY: compose-build-dev
compose-build-dev: ## Build all Docker Compose services for development.
	docker-compose -f docker-compose.dev.yml build

.PHONY: compose-down
compose-down: ## Stop and remove all Docker Compose services.
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

.PHONY: compose-logs
compose-logs: ## Show logs from all Docker Compose services.
	docker-compose logs -f

.PHONY: compose-logs-dev
compose-logs-dev: ## Show logs from all Docker Compose services in development mode.
	docker-compose -f docker-compose.dev.yml logs -f

##@ Helm
.PHONY: helm-lint
helm-lint: ## Lint the Helm chart.
	helm lint charts/lumi

.PHONY: helm-template
helm-template: ## Render the Helm chart templates.
	helm template lumi charts/lumi

.PHONY: helm-package
helm-package: ## Package the Helm chart.
	helm package charts/lumi

.PHONY: helm-install
helm-install: ## Install the Helm chart locally.
	helm install lumi charts/lumi

.PHONY: helm-upgrade
helm-upgrade: ## Upgrade the Helm chart locally.
	helm upgrade lumi charts/lumi

.PHONY: helm-uninstall
helm-uninstall: ## Uninstall the Helm chart locally.
	helm uninstall lumi