$TAG = "w6a"
$IMAGE = "chrisncs/restart"

Write-Host "Building $IMAGE:$TAG ..."
docker build -t "${IMAGE}:${TAG}" .

Write-Host "Pushing $IMAGE:$TAG ..."
docker push "${IMAGE}:${TAG}"

Write-Host "Tagging as latest ..."
docker tag "${IMAGE}:${TAG}" "${IMAGE}:latest"

Write-Host "Pushing $IMAGE:latest ..."
docker push "${IMAGE}:latest"

Write-Host "Removing local images ..."
docker rmi "${IMAGE}:${TAG}"
docker rmi "${IMAGE}:latest"

Write-Host "Done."
