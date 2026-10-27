-- Local development Prosody for Avio.
-- Credentials created by compose.yml:
--   alice@localhost / alice123
--   bob@localhost   / bob123
--
-- WebSocket endpoint: ws://localhost:5280/xmpp-websocket

admins = { "admin@localhost" }

modules_enabled = {
	"roster";
	"saslauth";
	"dialback";
	"disco";
	"carbons";
	"pep";
	"private";
	"blocklist";
	"vcard4";
	"vcard_legacy";
	"version";
	"uptime";
	"time";
	"ping";
	"smacks";
	"http";
	"websocket";
	"mam";
	"csi_simple";
	"admin_adhoc";
}

allow_registration = false
authentication = "internal_plain"

http_ports = { 5280 }
http_interfaces = { "*" }
cross_domain_websocket = true
consider_websocket_secure = true

data_path = "/var/lib/prosody"
log = {
	info = "/var/log/prosody/prosody.log";
	error = "/var/log/prosody/prosody.err";
}

VirtualHost "localhost"
	authentication = "internal_plain"
	modules_enabled = { "smacks"; "carbons"; "mam"; "websocket" }
