---
type: "always_apply"
---

# Auto Tauri Rules

type: auto
description: Apply when working on Tauri, Rust backend, desktop app, or src-tauri

---

## Tauri Command Pattern

```rust
#[tauri::command]
async fn command_name(
    state: tauri::State<'_, AppState>,
    param: String,
) -> Result<ResponseType, String> {
    // Validate input
    if param.is_empty() {
        return Err("Parameter required".to_string());
    }

    // Business logic
    let result = state.service.process(&param).await
        .map_err(|e| e.to_string())?;

    Ok(result)
}
```

## Frontend Invocation

```typescript
import { invoke } from '@tauri-apps/api/core';

async function callCommand() {
  try {
    const result = await invoke<ResponseType>('command_name', { param: value });
    return result;
  } catch (error) {
    console.error('Tauri command failed:', error);
    throw error;
  }
}
```

## State Management

```rust
pub struct AppState {
    pub db: DatabaseConnection,
    pub config: AppConfig,
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            command_one,
            command_two,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

## Error Handling

- Use Result<T, E> for all commands
- Convert errors to user-friendly messages
- Log errors server-side
- Handle network failures gracefully

## Security

- Validate all IPC inputs
- Use capability-based permissions
- Don't expose sensitive paths
- Sanitize file operations

## Testing

- Unit test Rust logic separately
- Integration test commands
- E2E test with Playwright
- Test on Windows, macOS, Linux
