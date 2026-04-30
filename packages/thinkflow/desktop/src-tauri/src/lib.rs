use std::{
    net::TcpListener,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const SETTINGS_STORE: &str = "thinkflow.settings.dat";
const SERVER_URL_KEY: &str = "serverUrl";

#[derive(Clone, serde::Serialize)]
struct ServerReadyData {
    url: String,
}

#[derive(Clone)]
struct ServerState {
    child: Arc<Mutex<Option<CommandChild>>>,
    url: Arc<Mutex<Option<String>>>,
}

impl ServerState {
    fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            url: Arc::new(Mutex::new(None)),
        }
    }
}

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .map(|l| l.local_addr().unwrap().port())
        .unwrap_or(4096)
}

async fn wait_for_server(url: &str, max_attempts: u32) -> bool {
    let client = reqwest::Client::new();
    for _ in 0..max_attempts {
        if client
            .get(format!("{}/health", url))
            .timeout(Duration::from_secs(2))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
        {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    false
}

#[tauri::command]
async fn ensure_server_ready(state: State<'_, ServerState>) -> Result<ServerReadyData, String> {
    let url = state.url.lock().unwrap().clone();
    match url {
        Some(u) => Ok(ServerReadyData { url: u }),
        None => Err("Server not yet ready".to_string()),
    }
}

#[tauri::command]
async fn kill_sidecar(state: State<'_, ServerState>) -> Result<(), String> {
    let mut child = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(c) = child.take() {
        let _ = c.kill();
    }
    Ok(())
}

#[tauri::command]
async fn get_default_server_url(app: AppHandle) -> Result<Option<String>, String> {
    let store = app
        .try_state::<tauri_plugin_store::Store<tauri::Wry>>()
        .ok_or("Store not available")?;
    Ok(store
        .get(SERVER_URL_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string())))
}

#[tauri::command]
async fn set_default_server_url(url: String, app: AppHandle) -> Result<(), String> {
    let store = app
        .try_state::<tauri_plugin_store::Store<tauri::Wry>>()
        .ok_or("Store not available")?;
    store.set(SERVER_URL_KEY, serde_json::Value::String(url));
    store.save().map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(ServerState::new())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let server_state = app.state::<ServerState>().inner().clone();

            tauri::async_runtime::spawn(async move {
                let port = find_free_port();
                let server_url = format!("http://127.0.0.1:{}", port);

                // 尝试启动 sidecar
                let sidecar_result = app_handle
                    .shell()
                    .sidecar("opencode-cli")
                    .map(|cmd| cmd.args(["serve", "--port", &port.to_string()]).spawn());

                match sidecar_result {
                    Ok(Ok((_, child))) => {
                        *server_state.child.lock().unwrap() = Some(child);
                        println!("[ThinkFlow] opencode-cli sidecar started on port {}", port);

                        if wait_for_server(&server_url, 60).await {
                            println!("[ThinkFlow] Server ready at {}", server_url);
                            *server_state.url.lock().unwrap() = Some(server_url);
                        } else {
                            eprintln!("[ThinkFlow] Server startup timeout");
                        }
                    }
                    Ok(Err(e)) => {
                        eprintln!("[ThinkFlow] Failed to spawn sidecar: {}", e);
                        // 回退到默认端口（用户可能已手动启动 opencode）
                        *server_state.url.lock().unwrap() =
                            Some("http://localhost:4096".to_string());
                    }
                    Err(e) => {
                        eprintln!("[ThinkFlow] Sidecar command error: {}", e);
                        *server_state.url.lock().unwrap() =
                            Some("http://localhost:4096".to_string());
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ensure_server_ready,
            kill_sidecar,
            get_default_server_url,
            set_default_server_url,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.app_handle().state::<ServerState>();
                if let Ok(mut child) = state.child.lock() {
                    if let Some(c) = child.take() {
                        let _ = c.kill();
                    }
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
