use tauri::Url;

/// Pages the shell serves itself: the bundled app on each platform, and the
/// Vite dev server while developing.
pub fn is_app_url(url: &Url, dev_origin: Option<&str>) -> bool {
    let bundled = matches!(
        (url.scheme(), url.host_str()),
        ("tauri", Some("localhost"))
            | ("http", Some("tauri.localhost"))
            | ("https", Some("tauri.localhost"))
    );
    bundled || dev_origin.is_some_and(|origin| url.origin().ascii_serialization() == origin)
}

/// Links that leave the app are handed to the system browser.
pub fn is_external_link(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https" | "mailto")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(value: &str) -> Url {
        Url::parse(value).expect("valid test URL")
    }

    #[test]
    fn bundled_app_origins_stay_in_the_window() {
        assert!(is_app_url(&url("tauri://localhost/index.html"), None));
        assert!(is_app_url(&url("http://tauri.localhost/"), None));
        assert!(is_app_url(&url("https://tauri.localhost/chat"), None));
    }

    #[test]
    fn dev_server_stays_in_the_window_only_when_configured() {
        let dev = url("http://localhost:3000/");
        assert!(is_app_url(&dev, Some("http://localhost:3000")));
        assert!(!is_app_url(&dev, None));
        assert!(!is_app_url(
            &url("http://localhost:3001/"),
            Some("http://localhost:3000")
        ));
    }

    #[test]
    fn remote_pages_are_not_app_urls() {
        assert!(!is_app_url(&url("https://example.com/"), None));
        assert!(!is_app_url(&url("http://tauri.localhost.example.com/"), None));
    }

    #[test]
    fn only_web_and_mail_links_go_to_the_system() {
        assert!(is_external_link(&url("https://example.com/file.png")));
        assert!(is_external_link(&url("http://example.com/")));
        assert!(is_external_link(&url("mailto:someone@example.com")));
        assert!(!is_external_link(&url("file:///etc/passwd")));
        assert!(!is_external_link(&url("javascript:alert(1)")));
        assert!(!is_external_link(&url("data:text/html,hi")));
    }
}
