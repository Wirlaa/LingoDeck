shared/README.md — Shared Models

Files here are identical across quest-service and card-service.
They are copied into each service at Docker build time via docker-compose
build context, so each container gets its own copy but there is only
one source of truth in the repo.

To update a shared model: edit the file here, then run:
  docker compose up --build

Do NOT edit the copies inside quest-service or card-service directly.
