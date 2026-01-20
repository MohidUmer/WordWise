from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging, os, json, datetime

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app, supports_credentials=True)

# --- Rate Limiting Setup ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["2000 per day", "500 per hour"],
    storage_uri="memory://",
    strategy="fixed-window"
)

# --- Logging setup (Optimized for Vercel) ---
# In serverless environments, we usually log to stdout/stderr.
logging.basicConfig(level=logging.WARNING, format="%(asctime)s - %(levelname)s - %(message)s")

# --- Questions storage ---
# We load questions to display/submit them.
QUESTION_FILE = "data/questions.json"
def load_questions():
    if os.path.exists(QUESTION_FILE):
        with open(QUESTION_FILE, "r") as f:
            return json.load(f)
    return []

def save_questions(questions):
    with open(QUESTION_FILE, "w") as f:
        json.dump(questions, f, indent=2)

def get_questions_data():
    return load_questions()

# --- Routes (All Public now) ---

@app.route('/')
def index():
    return redirect(url_for('home'))

@app.route('/home')
def home():
    return render_template('index.html')

@app.route('/blog')
def blog():
    return render_template('blog.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/faqs')
def faqs():
    return render_template('faqs.html')

@app.route('/resource')
def resource():
    return render_template('resource.html')

@app.route('/reviews')
def reviews_page():
    return render_template('reviews.html')

@app.route('/tools')
def tools():
    return render_template('tools.html')

# --- API Endpoints ---

@app.route("/api/submit-question", methods=["POST"])
@limiter.limit("5 per minute") # Specific limit for submissions
def submit_question():
    data = request.get_json(silent=True) or {}
    question_text = data.get("question", "").strip()
    username = data.get("username", "Anonymous") # Allow user to specify or default to Anonymous
    
    if not question_text:
        return jsonify({"success": False, "message": "Question text is required!"}), 400
    
    questions = load_questions()
    q_id = len(questions) + 1
    questions.append({
        "id": q_id,
        "question": question_text,
        "username": username,
        "status": "pending",
        "createdAt": datetime.datetime.now().strftime("%b %d, %Y")
    })
    save_questions(questions)
    
    # Log valid submissions (essential info)
    logging.info(f"New Question from {username}: {question_text}")
    
    return jsonify({"success": True, "message": "Question submitted successfully!", "id": q_id})

@app.route("/api/questions", methods=["GET"])
def get_questions():
    questions = load_questions()
    approved = [q for q in questions if q["status"] == "approved"]
    return jsonify(approved)

# --- Error Handlers ---
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify(error="Internal Server Error"), 500

@app.route('/robots.txt')
def robots():
    return app.send_static_file('robots.txt')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
