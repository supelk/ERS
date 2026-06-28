// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug, Deserialize)]
struct PaddleOcrRequest {
    api_url: String,
    api_key: String,
    file_base64: String,
    file_name: String,
}

#[derive(Debug, Serialize)]
struct PaddleOcrResponse {
    status: u16,
    content_type: String,
    body: String,
}

#[tauri::command]
async fn call_paddle_ocr(request: PaddleOcrRequest) -> Result<PaddleOcrResponse, String> {
    if request.api_url.trim().is_empty() {
        return Err("请先在设置页配置 PaddleOCR API 地址".to_string());
    }
    if request.api_key.trim().is_empty() {
        return Err("请先在设置页配置 PaddleOCR API Key".to_string());
    }

    let api_key = normalize_paddle_ocr_token(&request.api_key);
    let file_bytes = base64::engine::general_purpose::STANDARD
        .decode(request.file_base64.as_bytes())
        .map_err(|e| format!("图片 Base64 解码失败：{}", e))?;
    let model = "PaddleOCR-VL-1.6";

    let client = reqwest::Client::new();
    let optional_payload = json!({
        "useDocOrientationClassify": false,
        "useDocUnwarping": false,
        "useTextlineOrientation": false,
    });
    let file_part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(if request.file_name.trim().is_empty() {
            "exam-score.png".to_string()
        } else {
            request.file_name
        });
    let form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .text("optionalPayload", optional_payload.to_string())
        .part("file", file_part);

    let submit_response = client
        .post(request.api_url.trim())
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("PaddleOCR API 未返回响应：{}", e))?;

    let submit_status = submit_response.status().as_u16();
    let submit_body = submit_response
        .text()
        .await
        .map_err(|e| format!("读取 PaddleOCR API 提交响应失败：{}", e))?;
    if submit_status < 200 || submit_status >= 300 {
        return Ok(PaddleOcrResponse {
            status: submit_status,
            content_type: "application/json".to_string(),
            body: submit_body,
        });
    }

    let submit_json: serde_json::Value = serde_json::from_str(&submit_body)
        .map_err(|e| format!("解析 PaddleOCR API 提交响应失败：{}；响应：{}", e, submit_body))?;
    if submit_json.get("code").and_then(|v| v.as_i64()).unwrap_or(-1) != 0 {
        return Ok(PaddleOcrResponse {
            status: 400,
            content_type: "application/json".to_string(),
            body: submit_body,
        });
    }
    let job_id = submit_json
        .pointer("/data/jobId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("PaddleOCR API 提交响应缺少 jobId：{}", submit_body))?;

    let job_url = format!("{}/{}", request.api_url.trim().trim_end_matches('/'), job_id);
    let mut result_url = String::new();
    let mut last_poll_body = String::new();
    for _ in 0..36 {
        tokio::time::sleep(Duration::from_secs(2)).await;
        let poll_response = client
            .get(&job_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| format!("获取 PaddleOCR 任务结果失败：{}", e))?;
        let poll_status = poll_response.status().as_u16();
        let poll_body = poll_response
            .text()
            .await
            .map_err(|e| format!("读取 PaddleOCR 任务结果失败：{}", e))?;
        last_poll_body = poll_body.clone();
        if poll_status < 200 || poll_status >= 300 {
            return Ok(PaddleOcrResponse {
                status: poll_status,
                content_type: "application/json".to_string(),
                body: poll_body,
            });
        }
        let poll_json: serde_json::Value = serde_json::from_str(&poll_body)
            .map_err(|e| format!("解析 PaddleOCR 任务结果失败：{}；响应：{}", e, poll_body))?;
        let state = poll_json
            .pointer("/data/state")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        match state {
            "done" => {
                result_url = poll_json
                    .pointer("/data/resultUrl/jsonUrl")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                break;
            }
            "failed" => {
                let error_msg = poll_json
                    .pointer("/data/errorMsg")
                    .and_then(|v| v.as_str())
                    .unwrap_or("任务解析失败");
                return Err(format!("PaddleOCR 任务解析失败：{}", error_msg));
            }
            "pending" | "running" => {}
            _ => return Err(format!("未知 PaddleOCR 任务状态：{}；响应：{}", state, poll_body)),
        }
    }

    if result_url.is_empty() {
        return Err(format!("PaddleOCR 任务超时，最后状态：{}", last_poll_body));
    }

    let result_response = client
        .get(&result_url)
        .send()
        .await
        .map_err(|e| format!("下载 PaddleOCR 解析结果失败：{}", e))?;
    let status = result_response.status().as_u16();
    let content_type = result_response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();
    let body = result_response
        .text()
        .await
        .map_err(|e| format!("读取 PaddleOCR 解析结果失败：{}", e))?;

    Ok(PaddleOcrResponse {
        status,
        content_type,
        body,
    })
}

fn normalize_paddle_ocr_token(api_key: &str) -> String {
    let trimmed = api_key.trim();
    trimmed
        .strip_prefix("token ")
        .or_else(|| trimmed.strip_prefix("Token "))
        .or_else(|| trimmed.strip_prefix("TOKEN "))
        .or_else(|| trimmed.strip_prefix("Bearer "))
        .or_else(|| trimmed.strip_prefix("bearer "))
        .unwrap_or(trimmed)
        .trim()
        .to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, call_paddle_ocr])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
