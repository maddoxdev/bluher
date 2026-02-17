#!/bin/bash

echo "Deploying VoIP Application to Kubernetes"
echo "========================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Build Docker images
echo "Building Docker images..."
docker build -t voip-server:latest -f Dockerfile.server .
docker build -t voip-client:latest -f Dockerfile.client .

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n voip --timeout=300s

echo "Deploying server..."
kubectl apply -f k8s/server-deployment.yaml

echo "Deploying client..."
kubectl apply -f k8s/client-deployment.yaml

# Wait for deployments
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/voip-server -n voip --timeout=300s
kubectl wait --for=condition=available deployment/voip-client -n voip --timeout=300s

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Check deployment status:"
echo "  kubectl get pods -n voip"
echo "  kubectl get services -n voip"
echo ""
echo "Get service URLs:"
echo "  kubectl get svc -n voip"
