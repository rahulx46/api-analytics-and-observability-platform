# api-analytics-and-observability-platform

cd server
docker-compose down
docker-compose up -d --build
docker compose up -d --build <service-nme>
docker logs -f <service-name>

// to completely rmeove old container and build new

docker compose stop <service-name>
docker compose build --no-cache <service-name>
docker compose up -d <service-name>
