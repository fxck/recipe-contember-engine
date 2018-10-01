#!/bin/sh
ECR="831119889470.dkr.ecr.eu-central-1.amazonaws.com"
REPO="mangoweb/app/cms-admin"

ecr-login

docker build -t "$ECR/$REPO:$VERSION" ./mangoweb/admin
docker push "$ECR/$REPO:$VERSION"

REPO="mangoweb/app/cms-api"
docker build -t "$ECR/$REPO:$VERSION" ./mangoweb/cms-api
docker push "$ECR/$REPO:$VERSION"
