use tauri_plugin_store::StoreExt;
use serde_json::Value;

#[tauri::command]
async fn call_anthropic(
    app: tauri::AppHandle,
    body: Value,
) -> Result<Value, String> {
    // Read API key from plugin-store (never from frontend) per D-05
    let store = app.store("dynasty-os.bin").map_err(|e| e.to_string())?;
    let api_key = store
        .get("anthropic-api-key")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "No API key configured".to_string())?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!(
            "Anthropic API error {}: {}",
            status.as_u16(),
            json.get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or("unknown error")
        ));
    }
    Ok(json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![call_anthropic])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
