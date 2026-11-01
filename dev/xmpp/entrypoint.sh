#!/bin/sh
set -e

mkdir -p /var/lib/prosody /var/run/prosody
chown -R prosody:prosody /var/lib/prosody /var/run/prosody

prosodyctl register alice localhost alice123 || true
for user in bob phiey james ivan sam mary lisa; do
	prosodyctl register "$user" localhost bob123 || true
done

exec setpriv --reuid=prosody --regid=prosody --init-groups prosody -F
