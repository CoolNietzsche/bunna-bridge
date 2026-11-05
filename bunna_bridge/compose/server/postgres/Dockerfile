# PostGIS (needed for farm boundaries and forest checks) plus the
# cookiecutter backup/restore helpers: `backup`, `backups`, `restore`.
FROM postgis/postgis:16-3.4

COPY ./compose/production/postgres/maintenance /usr/local/bin/maintenance
RUN chmod +x /usr/local/bin/maintenance/* \
    && mv /usr/local/bin/maintenance/* /usr/local/bin \
    && rmdir /usr/local/bin/maintenance
