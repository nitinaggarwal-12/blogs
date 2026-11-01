#!/usr/bin/env bash
# ==============================================================================
# One-Time GCP Setup for Automated GitHub Actions Deployments to Cloud Run
# Using Keyless Google Cloud Workload Identity Federation (WIF)
# Target Project: ramp-portal-dev (#248990048888) | Service: ge-blogs (us-west1)
# ==============================================================================

set -euo pipefail

PROJECT_ID="ramp-portal-dev"
REGION="us-west1"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-provider"
SA_NAME="ge-blogs-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "================================================================================"
echo " Setting up Workload Identity Federation in GCP Project: ${PROJECT_ID}"
echo "================================================================================"

# 1. Ensure required Google Cloud APIs are enabled
echo "==> [1/6] Enabling IAM, STS & Cloud Run APIs..."
gcloud services enable     iam.googleapis.com     iamcredentials.googleapis.com     sts.googleapis.com     run.googleapis.com     artifactregistry.googleapis.com     cloudresourcemanager.googleapis.com     --project="${PROJECT_ID}"

# 2. Create Deployer Service Account if not exists
echo "==> [2/6] Ensuring Deployer Service Account (${SA_EMAIL}) exists..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud iam service-accounts create "${SA_NAME}"         --project="${PROJECT_ID}"         --description="GitHub Actions automated continuous deployer for ge-blogs"         --display-name="ge-blogs-deployer"
    echo "    Created service account: ${SA_EMAIL}"
else
    echo "    Service account ${SA_EMAIL} already exists."
fi

# 3. Grant Required Cloud Run & Artifact Registry IAM Roles
echo "==> [3/6] Binding IAM roles (run.admin, artifactregistry.writer, serviceAccountUser)..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}"     --member="serviceAccount:${SA_EMAIL}"     --role="roles/run.admin"     --condition=None --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}"     --member="serviceAccount:${SA_EMAIL}"     --role="roles/artifactregistry.writer"     --condition=None --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}"     --member="serviceAccount:${SA_EMAIL}"     --role="roles/iam.serviceAccountUser"     --condition=None --quiet >/dev/null

# 4. Create Workload Identity Pool
echo "==> [4/6] Ensuring Workload Identity Pool (${POOL_NAME}) exists..."
if ! gcloud iam workload-identity-pools describe "${POOL_NAME}" --project="${PROJECT_ID}" --location="global" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools create "${POOL_NAME}"         --project="${PROJECT_ID}"         --location="global"         --display-name="GitHub Actions Deployment Pool"
    echo "    Created Workload Identity Pool: ${POOL_NAME}"
else
    echo "    Workload Identity Pool ${POOL_NAME} already exists."
fi

# 5. Create Workload Identity Provider for GitHub
echo "==> [5/6] Ensuring Workload Identity Provider (${PROVIDER_NAME}) exists..."
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}"     --project="${PROJECT_ID}"     --location="global"     --workload-identity-pool="${POOL_NAME}" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}"         --project="${PROJECT_ID}"         --location="global"         --workload-identity-pool="${POOL_NAME}"         --display-name="GitHub OIDC Provider"         --issuer-uri="https://token.actions.githubusercontent.com"         --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"
    echo "    Created Workload Identity Provider: ${PROVIDER_NAME}"
else
    echo "    Workload Identity Provider ${PROVIDER_NAME} already exists."
fi

# 6. Bind Workload Identity User permissions to GitHub Repositories
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
echo "==> [6/6] Authorizing GitHub repositories (cloud-ai-fde/ge-blogs & nitinaggarwal-12/blogs)..."

# Allow cloud-ai-fde/ge-blogs
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}"     --project="${PROJECT_ID}"     --role="roles/iam.workloadIdentityUser"     --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/cloud-ai-fde/ge-blogs"     --quiet >/dev/null

# Allow nitinaggarwal-12/blogs
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}"     --project="${PROJECT_ID}"     --role="roles/iam.workloadIdentityUser"     --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/nitinaggarwal-12/blogs"     --quiet >/dev/null

echo "================================================================================"
echo " ✅ WORKLOAD IDENTITY FEDERATION CONFIGURATION COMPLETE!"
echo " Provider Resource Name:"
echo "   projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
echo " Service Account:"
echo "   ${SA_EMAIL}"
echo "================================================================================"
echo "From now on, every 'git push origin main' will automatically build and deploy"
echo "to Cloud Run via GitHub Actions with 100% keyless authentication."
echo "================================================================================"
