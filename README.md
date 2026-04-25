# LingoDeck

A web-based language learning platform based on a collectible card game. 
Use docker compose -f docker-compose.yml -f docker-compose-with-traefik.yml up -d --build to build.

## Tasks

Refer to the Lingo Deck Project kanban board at github

## Rules for merging commits

- Definition of done - each PR must include a working feature along with appropriate tests and updated documentation
- Stable main branch - ideally each merge must successfully pass a testing pipeline


## Note about certificates

An https certificate is not included in the repository because it needs to be issued
by Mkcert on your own system. Before running both .yml docker files make sure to install
mkcert using the following guide https://community.chocolatey.org/packages/mkcert

Then run the following command: 
mkdir traefik/certs
mkcert -cert-file traefik/certs/lingodeck-local.pem -key-file traefik/certs/lingodeck-local-key.pem localhost 127.0.0.1 ::1 app.localhost api.localhost auth.localhost quest.localhost card.localhost challenge.localhost grafana.localhost prometheus.localhost traefik.localhost

This does not work for firefox since it uses its own system, but for other Chromium based
browsers the certificate error should disappear.
