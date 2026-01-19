from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib, logging, os, json
from datetime import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Allow frontend requests with credentials

# --- Logging setup ---
logging.basicConfig(filename="flask.log", level=logging.INFO, format="%(asctime)s - %(message)s")

# --- User storage ---
USER_FILE = "data/users.txt"
def hash_password(password): return hashlib.sha256(password.encode()).hexdigest()
def load_users():
    users = {}
    if os.path.exists(USER_FILE):
        with open(USER_FILE, "r") as f:
            for line in f:
                parts = line.strip().split("|")
                if len(parts) == 3:
                    email, username, password = parts
                    users[email] = {"username": username, "password": password}
    return users
def save_users(users):
    with open(USER_FILE, "w") as f:
        for email, data in users.items():
            f.write(f"{email}|{data['username']}|{data['password']}\n")
users = load_users()

@app.before_request
def log_request_info():
    data = request.get_json(silent=True)
    logging.info(f"Request: {request.method} {request.path} - Data: {data}")

# --- Register/Login routes ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if not email or not username or not password:
        return jsonify({"success": False, "message": "Missing fields!"}), 400
    if email in users:
        return jsonify({"success": False, "message": "User already exists!"}), 400
    users[email] = {"username": username, "password": hash_password(password)}
    save_users(users)
    return jsonify({"success": True, "message": "User registered successfully!"})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    if not email or not password:
        return jsonify({"success": False, "message": "Missing fields!"}), 400
    if email not in users:
        return jsonify({"success": False, "message": "User not found!"}), 404
    if users[email]["password"] != hash_password(password):
        return jsonify({"success": False, "message": "Wrong password!"}), 401
    return jsonify({"success": True, "message": f"Welcome {users[email]['username']}!", "username": users[email]['username']})

# --- Questions storage ---
QUESTION_FILE = "data/questions.json"
def load_questions():
    if os.path.exists(QUESTION_FILE):
        with open(QUESTION_FILE, "r") as f:
            return json.load(f)
    return []
def save_questions(questions):
    with open(QUESTION_FILE, "w") as f:
        json.dump(questions, f, indent=2)
questions = load_questions()

# --- Submit FAQ Question ---
@app.route("/submit-question", methods=["POST"])
def submit_question():
    data = request.get_json(silent=True) or {}
    question_text = data.get("question", "").strip()
    username = data.get("username", "Anonymous")
    if not question_text:
        return jsonify({"success": False, "message": "Question text is required!"}), 400
    q_id = len(questions) + 1
    question = {
        "id": q_id,
        "question": question_text,
        "username": username,
        "status": "pending",
        "createdAt": datetime.now().strftime("%b %d, %Y")
    }
    questions.append(question)
    save_questions(questions)
    return jsonify({"success": True, "message": "Question submitted successfully!", "id": q_id})

@app.route("/questions", methods=["GET"])
def get_questions():
    approved = [q for q in questions if q["status"] == "approved"]
    return jsonify(approved)

# --- Run app ---
if __name__ == '__main__':
    app.run(debug=True)
