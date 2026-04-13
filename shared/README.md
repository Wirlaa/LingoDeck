# shared/

Canonical SQLAlchemy models used by quest-service and card-service.

The Dockerfiles for those services copy these files over the per-service
stubs at build time:

    COPY shared/ ./shared/
    RUN cp shared/models/language_content.py app/models/language_content.py && \
        cp shared/models/base.py app/models/base.py

During local dev (outside Docker) the per-service stubs are identical so
imports work either way.
