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