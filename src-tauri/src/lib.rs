use std::path::Path;
use std::process::Command;
use tauri::Manager;

const MEDIA_DIRECTORY_NAME: &str = "media";
const TAURI_STORE_FILE_NAME: &str = "conflux_universe.json";

#[tauri::command]
fn hello_conflux_desktop() -> String {
    "Hello Conflux Desktop".to_string()
}

fn normalize_native_media_relative_path(relative_path: &str) -> Result<String, String> {
    let normalized = relative_path.replace('\\', "/");
    if normalized.is_empty()
        || normalized.starts_with('/')
        || normalized.contains("..")
        || !normalized.starts_with(&format!("{MEDIA_DIRECTORY_NAME}/"))
    {
        return Err("Invalid media path.".to_string());
    }

    Ok(normalized)
}

fn open_path_in_system(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .arg("/C")
            .arg("start")
            .arg("")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn open_native_media(app: tauri::AppHandle, relative_path: String) -> Result<(), String> {
    let normalized = normalize_native_media_relative_path(&relative_path)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let media_path = app_data_dir.join(normalized);

    if !media_path.is_file() {
        return Err("Media file is unavailable.".to_string());
    }

    open_path_in_system(&media_path)
}

#[tauri::command]
fn open_conflux_store_file(app: tauri::AppHandle) -> Result<(), String> {
    let store_path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(TAURI_STORE_FILE_NAME);

    if !store_path.is_file() {
        return Err("Store file is unavailable.".to_string());
    }

    open_path_in_system(&store_path)
}

#[tauri::command]
fn open_conflux_media_directory(app: tauri::AppHandle) -> Result<(), String> {
    let media_directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(MEDIA_DIRECTORY_NAME);

    std::fs::create_dir_all(&media_directory).map_err(|error| error.to_string())?;

    open_path_in_system(&media_directory)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            hello_conflux_desktop,
            open_native_media,
            open_conflux_store_file,
            open_conflux_media_directory
        ])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::normalize_native_media_relative_path;

    #[test]
    fn accepts_media_relative_path() {
        assert_eq!(
            normalize_native_media_relative_path("media/media_1.png").unwrap(),
            "media/media_1.png",
        );
    }

    #[test]
    fn normalizes_windows_separators() {
        assert_eq!(
            normalize_native_media_relative_path("media\\media_1.png").unwrap(),
            "media/media_1.png",
        );
    }

    #[test]
    fn rejects_path_traversal() {
        assert!(normalize_native_media_relative_path("media/../secret.txt").is_err());
        assert!(normalize_native_media_relative_path("../media/media_1.png").is_err());
    }

    #[test]
    fn rejects_absolute_or_non_media_paths() {
        assert!(normalize_native_media_relative_path("/media/media_1.png").is_err());
        assert!(normalize_native_media_relative_path("notes/media_1.png").is_err());
        assert!(normalize_native_media_relative_path("").is_err());
    }
}
