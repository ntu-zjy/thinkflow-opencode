use futures::FutureExt;
use std::{
    collections::VecDeque,
    net::TcpListener,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Manager, RunEvent, State, WebviewUrl, WebviewWindow};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::oneshot;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Clone, serde::Serialize)]
struct ServerReadyData {
    url: String,
    password: Option<String>,
}

#[derive(Clone)]
struct ServerState {
    child: Arc<Mutex<Option<CommandChild>>>,
    status: futures::future::Shared<oneshot::Receiver<Result<ServerReadyData, String>>>,
}

impl ServerState {
    fn new(
        child: Option<CommandChild>,
        rx: oneshot::Receiver<Result<ServerReadyData, String>>,
    ) -> Self {
        Self {
            child: Arc::new(Mutex::new(child)),
            status: rx.shared(),
        }
    }

    fn set_child(&self, child: Option<CommandChild>) {
        *self.child.lock().unwrap() = child;
    }
}

struct LogState(Arc<Mutex<VecDeque<String>>>);
const MAX_LOG_ENTRIES: usize = 200;

// ── Port helper ───────────────────────────────────────────────────────────────

fn get_free_port() -> u32 {
    TcpListener::bind("127.0.0.1:0")
        .map(|l| l.local_addr().unwrap().port() as u32)
        .unwrap_or(4096)
}

// ── Sidecar path ─────────────────────────────────────────────────────────────

fn get_sidecar_path(app: &AppHandle) -> std::path::PathBuf {
    tauri::process::current_binary(&app.env())
        .expect("Failed to get current binary")
        .parent()
        .expect("Failed to get parent dir")
        .join("opencode-cli")
}

// ── Health check ─────────────────────────────────────────────────────────────

async fn check_health(url: &str) -> bool {
    let health_url = format!("{}/global/health", url.trim_end_matches('/'));
    reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .ok()
        .map(|c| async move { c.get(&health_url).send().await.map(|r| r.status().is_success()).unwrap_or(false) })
        .map(|f| tauri::async_runtime::block_on(f))
        .unwrap_or(false)
}

// ── Spawn sidecar ─────────────────────────────────────────────────────────────

fn spawn_sidecar(app: &AppHandle, port: u32, password: &str) -> CommandChild {
    let log_state = app.state::<LogState>();
    let log_clone = log_state.inner().0.clone();

    let sidecar_path = get_sidecar_path(app);
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());

    let (mut rx, child) = app
        .shell()
        .command(&shell)
        .env("OPENCODE_SERVER_PASSWORD", password)
        .env("OPENCODE_CLIENT", "thinkflow")
        .args([
            "-il",
            "-c",
            &format!("\"{}\" serve --port {}", sidecar_path.display(), port),
        ])
        .spawn()
        .expect("Failed to spawn opencode-cli sidecar");

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            let line = match event {
                CommandEvent::Stdout(b) => format!("[OUT] {}", String::from_utf8_lossy(&b)),
                CommandEvent::Stderr(b) => format!("[ERR] {}", String::from_utf8_lossy(&b)),
                _ => continue,
            };
            print!("{line}");
            if let Ok(mut logs) = log_clone.lock() {
                logs.push_back(line);
                while logs.len() > MAX_LOG_ENTRIES {
                    logs.pop_front();
                }
            }
        }
    });

    child
}

// ── Server connection setup ───────────────────────────────────────────────────

async fn setup_server(app: &AppHandle) -> Result<(Option<CommandChild>, ServerReadyData), String> {
    let port = get_free_port();
    let url = format!("http://127.0.0.1:{port}");
    let password = uuid::Uuid::new_v4().to_string();

    let child = spawn_sidecar(app, port, &password);

    // Wait up to 15s for server to be ready
    for i in 0..30 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if check_health(&url).await {
            println!("OpenCode server ready at {url} (attempt {})", i + 1);
            return Ok((
                Some(child),
                ServerReadyData {
                    url,
                    password: Some(password),
                },
            ));
        }
    }

    Err(format!("OpenCode server failed to start on port {port}"))
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
async fn ensure_server_ready(
    state: State<'_, ServerState>,
) -> Result<ServerReadyData, String> {
    state
        .status
        .clone()
        .await
        .map_err(|_| "Server status channel closed".to_string())?
}

#[tauri::command]
fn kill_sidecar(app: AppHandle) {
    let Some(state) = app.try_state::<ServerState>() else { return };
    if let Some(child) = state.child.lock().unwrap().take() {
        let _ = child.kill();
        println!("ThinkFlow: killed opencode sidecar");
    }
}

// ── App entry ─────────────────────────────────────────────────────────────────

pub fn run() {
    let (tx, rx) = oneshot::channel::<Result<ServerReadyData, String>>();

    let server_state = ServerState::new(None, rx);
    let log_state = LogState(Arc::new(Mutex::new(VecDeque::new())));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .manage(server_state)
        .manage(log_state)
        .invoke_handler(tauri::generate_handler![ensure_server_ready, kill_sidecar])
        .setup(|app| {
            // Create main window
            WebviewWindow::builder(app, "main", WebviewUrl::App("/".into()))
                .title("思流 · ThinkFlow")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .build()?;

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let result = setup_server(&app_handle).await;
                match result {
                    Ok((child, data)) => {
                        app_handle.state::<ServerState>().set_child(child);
                        let _ = tx.send(Ok(data));
                    }
                    Err(e) => {
                        eprintln!("ThinkFlow: failed to start server — {e}");
                        let _ = tx.send(Err(e));
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building ThinkFlow")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                kill_sidecar(app.clone());
            }
        });
}
