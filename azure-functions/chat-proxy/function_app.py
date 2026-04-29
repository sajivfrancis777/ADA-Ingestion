"""Azure Function — Chat Proxy for Azure OpenAI.

Forwards chat requests from the browser to Azure OpenAI Responses API,
adding the api-key server-side and returning CORS headers.

Environment variables (set in Function App → Configuration):
  AZURE_OPENAI_ENDPOINT   — e.g. https://sajiv-moknxo97-eastus2.cognitiveservices.azure.com
  AZURE_OPENAI_KEY        — your Azure OpenAI API key
  AZURE_OPENAI_MODEL      — model name (e.g. gpt-5.4-pro)
  AZURE_OPENAI_API_VERSION — e.g. 2025-04-01-preview
  ALLOWED_ORIGINS         — comma-separated origins (default: *)
"""

import json
import logging
import os

import azure.functions as func
import httpx

app = func.FunctionApp()

CORS_HEADERS = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
}


def _allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "*")
    if raw.strip() == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


def _cors_origin(req: func.HttpRequest) -> str:
    origin = req.headers.get("Origin", "")
    allowed = _allowed_origins()
    if "*" in allowed:
        return "*"
    if origin in allowed:
        return origin
    return ""


@app.route(route="chat", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def chat_proxy(req: func.HttpRequest) -> func.HttpResponse:
    origin = _cors_origin(req)
    cors = {**CORS_HEADERS, "Access-Control-Allow-Origin": origin} if origin else CORS_HEADERS

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=cors)

    # Validate config
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    api_key = os.environ.get("AZURE_OPENAI_KEY", "")
    model = os.environ.get("AZURE_OPENAI_MODEL", "gpt-5.4-pro")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2025-04-01-preview")

    if not endpoint or not api_key:
        return func.HttpResponse(
            json.dumps({"error": "Azure OpenAI not configured on server"}),
            status_code=500,
            headers={**cors, "Content-Type": "application/json"},
        )

    # Parse request body
    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON body"}),
            status_code=400,
            headers={**cors, "Content-Type": "application/json"},
        )

    # Convert chat messages to Responses API format
    messages = body.get("messages", [])
    max_tokens = body.get("max_tokens", 1024)
    payload = {
        "model": model,
        "input": messages,
        "max_output_tokens": max(16, max_tokens),
    }
    # Pass through optional parameters
    if "temperature" in body:
        payload["temperature"] = body["temperature"]

    # Forward to Azure OpenAI Responses API
    url = f"{endpoint}/openai/responses?api-version={api_version}"

    try:
        with httpx.Client(timeout=60.0, verify=False) as client:
            resp = client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "api-key": api_key,
                },
            )
    except httpx.TimeoutException:
        return func.HttpResponse(
            json.dumps({"error": "Azure OpenAI request timed out"}),
            status_code=504,
            headers={**cors, "Content-Type": "application/json"},
        )
    except Exception as e:
        logging.error(f"Proxy error: {e}")
        return func.HttpResponse(
            json.dumps({"error": f"Proxy error: {str(e)}"}),
            status_code=502,
            headers={**cors, "Content-Type": "application/json"},
        )

    # Transform Responses API output to Chat Completions format for frontend compatibility
    if resp.status_code == 200:
        try:
            resp_data = resp.json()
            # Extract text from Responses API: output[0].content[0].text
            output_items = resp_data.get("output", [])
            text = ""
            for item in output_items:
                if item.get("type") == "message":
                    for content_part in item.get("content", []):
                        if content_part.get("type") == "output_text":
                            text += content_part.get("text", "")
            # Return in Chat Completions shape so frontend doesn't need changes
            normalized = {
                "choices": [{"message": {"role": "assistant", "content": text}}],
                "model": model,
            }
            return func.HttpResponse(
                json.dumps(normalized),
                status_code=200,
                headers={**cors, "Content-Type": "application/json"},
            )
        except Exception:
            pass  # Fall through to raw response

    return func.HttpResponse(
        body=resp.content,
        status_code=resp.status_code,
        headers={**cors, "Content-Type": "application/json"},
    )
