from flask import Flask, jsonify, request, g
from functools import wraps
from typing import Any
import time

app = Flask(__name__)

# ---- In-memory data store ---------------------------------------------------

tasks: list[dict[str, Any]] = [
    {"id": 1, "title": "Buy groceries", "done": False, "priority": "high"},
    {"id": 2, "title": "Write tests", "done": False, "priority": "medium"},
    {"id": 3, "title": "Read book", "done": True, "priority": "low"},
]

# ---- Middleware / decorators -------------------------------------------------

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Missing authorization header"}), 401
        if token == "invalid":
            return jsonify({"error": "Invalid token"}), 401
        g.user_id = "1"
        return f(*args, **kwargs)
    return decorated


@app.before_request
def log_request():
    g.start_time = time.time()


@app.after_request
def log_response(response):
    elapsed = (time.time() - g.start_time) * 1000
    app.logger.info(f"{request.method} {request.path} {response.status_code} {elapsed:.0f}ms")
    return response


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e)}), 400

# ---- Routes -----------------------------------------------------------------

@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/tasks")
@require_auth
def list_tasks():
    priority = request.args.get("priority")
    done = request.args.get("done")
    result = tasks
    if priority:
        result = [t for t in result if t["priority"] == priority]
    if done is not None:
        result = [t for t in result if t["done"] == (done.lower() == "true")]
    return jsonify({"tasks": result, "total": len(result)})


@app.get("/api/tasks/<int:task_id>")
@require_auth
def get_task(task_id: int):
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task)


@app.post("/api/tasks")
@require_auth
def create_task():
    body = request.get_json()
    if not body or not body.get("title"):
        return jsonify({"error": "title is required"}), 400
    new_task = {
        "id": len(tasks) + 1,
        "title": body["title"],
        "done": body.get("done", False),
        "priority": body.get("priority", "medium"),
    }
    tasks.append(new_task)
    return jsonify(new_task), 201


@app.put("/api/tasks/<int:task_id>")
@require_auth
def update_task(task_id: int):
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    body = request.get_json() or {}
    task.update({k: v for k, v in body.items() if k in ("title", "done", "priority")})
    return jsonify(task)


@app.delete("/api/tasks/<int:task_id>")
@require_auth
def delete_task(task_id: int):
    idx = next((i for i, t in enumerate(tasks) if t["id"] == task_id), None)
    if idx is None:
        return jsonify({"error": "Task not found"}), 404
    tasks.pop(idx)
    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5000)
