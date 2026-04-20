use tauri::menu::MenuEvent;
use tauri::menu::{SubmenuBuilder, HELP_SUBMENU_ID};
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;

pub fn setup_macos_menu(app: &AppHandle) -> tauri::Result<()> {
    let global_menu = app.menu().unwrap();

    if let Some(item) = global_menu.get(HELP_SUBMENU_ID) {
        global_menu.remove(&item)?;
    }

    global_menu.append(
        // &SubmenuBuilder::new(app, "Help")
        //     .text("privacy_policy", "Privacy Policy")
        //     .separator()
        //     .text("report_issue", "Report An Issue...")
        //     .text("readest_help", "Readest Help")
        //     .build()?,
        &SubmenuBuilder::new(app, "Help")
            .text("give_feedback", "Give Feedback")
            .build()?,
    )?;

    app.on_menu_event(|app, event| {
        handle_menu_event(app, &event);
    });

    Ok(())
}

pub fn handle_menu_event(app: &AppHandle, event: &MenuEvent) {
    let opener = app.opener();
    let event_id = event.id().as_ref();
    
    if event_id == "give_feedback" {
        let _ = opener.open_url("mailto:support@limstack.com", None::<&str>);
    } else if event_id.starts_with("view-playlist-in-browser-") {
        let playlist_id = event_id.strip_prefix("view-playlist-in-browser-").unwrap();
        let _ = app.emit("view-playlist-in-browser", playlist_id);
    } else if event_id.starts_with("view-channel-in-browser-") {
        let channel_id = event_id.strip_prefix("view-channel-in-browser-").unwrap();
        let _ = app.emit("view-channel-in-browser", channel_id);
    } else if event_id.starts_with("delete-playlist-") {
        let playlist_id = event_id.strip_prefix("delete-playlist-").unwrap();
        let _ = app.emit("delete-playlist", playlist_id);
    } else if event_id.starts_with("delete-channel-") {
        let channel_id = event_id.strip_prefix("delete-channel-").unwrap();
        let _ = app.emit("delete-channel", channel_id);
    } else if event_id.starts_with("add-divider-playlist-") {
        let playlist_id = event_id.strip_prefix("add-divider-playlist-").unwrap();
        let _ = app.emit("add-divider-playlist", playlist_id);
    } else if event_id.starts_with("add-divider-channel-") {
        let channel_id = event_id.strip_prefix("add-divider-channel-").unwrap();
        let _ = app.emit("add-divider-channel", channel_id);
    } else if event_id.starts_with("delete-divider-") {
        let divider_id = event_id.strip_prefix("delete-divider-").unwrap();
        let _ = app.emit("delete-divider", divider_id);
    }
}
