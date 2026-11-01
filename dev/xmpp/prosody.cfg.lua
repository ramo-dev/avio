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

Component "conference.localhost" "muc"
	restrict_room_creation = false
	modules_enabled = { "muc_mam" }

-- Dev-only HTTP upload (XEP-0363). Production servers configure their own.
Component "upload.localhost" "http_upload"
	http_upload_file_size_limit = 10485760
	http_upload_expire_after = 3600
	http_external_url = "http://upload.localhost:5280/"
