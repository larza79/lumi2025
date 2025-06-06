# Lumi Release Pipeline

This repository contains a GitHub Actions pipeline that automatically builds and deploys your application when a release is created.

## What the pipeline does

When you create a release in GitHub, the pipeline will:

1. **Build Application Image**:

   - Builds a Docker image using the `Dockerfile`
   - Tags it with the git short hash: `ghcr.io/larza79/lumi:{git-short-hash}`
   - Also tags it with the release tag: `ghcr.io/larza79/lumi:{release-tag}`
   - Pushes to GitHub Container Registry

2. **Update Helm Chart**:
   - Updates `charts/lumi/values.yaml` to use the new image
   - Updates `charts/lumi/Chart.yaml` with the release version
   - Packages the Helm chart
   - Pushes the Helm chart as OCI image to `oci://ghcr.io/larza79/charts`

## How to use

1. **Create a release**: Go to GitHub → Releases → Create a new release
2. **Tag your release**: Use semantic versioning (e.g., `v1.0.0`, `v1.2.3`)
3. **Publish**: The pipeline will automatically trigger

## Prerequisites

- Your repository needs to have GitHub Actions enabled
- The `GITHUB_TOKEN` is automatically provided by GitHub Actions
- Make sure GitHub Container Registry is enabled for your repository

## Registry Access

The pipeline pushes to:

- **Application images**: `ghcr.io/larza79/lumi`
- **Helm charts**: `ghcr.io/larza79/charts/lumi`

## Local Development

To test the Helm chart locally:

```bash
# Install the chart
helm install lumi ./charts/lumi

# Upgrade with custom values
helm upgrade lumi ./charts/lumi --set image.tag=your-tag

# Uninstall
helm uninstall lumi
```

## Dockerfile Notes

The current Dockerfile uses `nginxinc/nginx-unprivileged:latest` as the base image and copies files from the `src/` directory to serve static content.
