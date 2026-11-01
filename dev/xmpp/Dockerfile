# Dev/test image. Not for production: no TLS, test accounts, permissive config.
FROM debian:bookworm-slim
RUN apt-get update \
	&& apt-get install -y --no-install-recommends prosody prosody-modules ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& sed -i 's|^if module:http_url|if false and module:http_url|' /usr/lib/prosody/modules/mod_http_upload/mod_http_upload.lua
COPY entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint
EXPOSE 5280
ENTRYPOINT ["/usr/local/bin/entrypoint"]
