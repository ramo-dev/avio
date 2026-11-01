mod navigation;

use tauri::{webview::NewWindowResponse, AppHandle, Config, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dev_origin = dev_origin(app.config());
            let navigation_app = app.handle().clone();
            let new_window_app = app.handle().clone();
            let navigation_dev_origin = dev_origin.clone();

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Avio")
                .inner_size(1100.0, 760.0)
                .min_inner_size(360.0, 480.0)
                .on_navigation(move |url| {
                    if navigation::is_app_url(url, navigation_dev_origin.as_deref()) {
                        return true;
                    }
                    open_external(&navigation_app, url);
                    false
                })
                .on_new_window(move |url, _features| {
                    open_external(&new_window_app, &url);
                    NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Avio");
}

fn dev_origin(config: &Config) -> Option<String> {
    if !cfg!(debug_assertions) {
        return None;
    }
    config
        .build
        .dev_url
        .as_ref()
        .map(|url| url.origin().ascii_serialization())
}

fn open_external(app: &AppHandle, url: &Url) {
    if navigation::is_external_link(url) {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}
