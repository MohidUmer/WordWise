from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import logging, os, json, datetime, html

app = Flask(__name__, template_folder='templates', static_folder='static')

# --- Security Settings ---
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # Limit to 1MB requests

# --- Security Headers (Production Ready) ---
# Allow resources from trusted CDNs for GSAP, Tailwind, RemixIcon
csp = {
    'default-src': '\'self\'',
    'script-src': [
        '\'self\'',
        'https://cdn.tailwindcss.com',
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js',
        '\'unsafe-inline\'' # Required for Tailwind config and inline scripts
    ],
    'style-src': [
        '\'self\'',
        'https://cdn.jsdelivr.net',
        '\'unsafe-inline\''
    ],
    'font-src': [
        '\'self\'',
        'https://cdn.jsdelivr.net'
    ],
    'img-src': ['\'self\'', 'data:', 'https://*']
}
# Talisman applies HSTS, XSS protection, and CSP headers
Talisman(app, 
         content_security_policy=csp, 
         force_https=False, # Vercel handles HTTPS redirect at the edge
         referrer_policy='strict-origin-when-cross-origin',
         frame_options='DENY') 
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
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# --- Storage ---
QUESTION_FILE = "data/questions.json"
REVIEW_FILE = "data/reviews.json"

def load_data(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_data(file_path, data):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logging.error(f"Failed to save to {file_path}: {e}")
        return False

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

def sanitize_input(text, max_len=500):
    if not text: return ""
    # Strip HTML tags and limit length
    clean = html.escape(text.strip())
    return clean[:max_len]

# Questions API
@app.route("/api/submit-question", methods=["POST"])
@limiter.limit("5 per minute") 
def submit_question():
    data = request.get_json(silent=True) or {}
    question_text = sanitize_input(data.get("question", ""), 300)
    username = sanitize_input(data.get("username", "Anonymous"), 50)
    
    if not question_text:
        return jsonify({"success": False, "message": "Valid question text is required!"}), 400
    
    questions = load_data(QUESTION_FILE)
    q_id = len(questions) + 1
    new_q = {
        "id": q_id,
        "question": question_text,
        "username": username,
        "status": "pending",
        "createdAt": datetime.datetime.now().strftime("%b %d, %Y")
    }
    questions.append(new_q)
    
    if save_data(QUESTION_FILE, questions):
        logging.info(f"New Question from {username}")
        return jsonify({"success": True, "message": "Question submitted successfully!", "id": q_id})
    else:
        return jsonify({"success": False, "message": "Server storage error"}), 500

@app.route("/api/questions", methods=["GET"])
def get_questions():
    questions = load_data(QUESTION_FILE)
    approved = [q for q in questions if q["status"] == "approved"]
    return jsonify(approved)

# Reviews API
@app.route("/api/reviews", methods=["GET", "POST"])
@limiter.limit("3 per minute", methods=["POST"])
@limiter.limit("60 per minute", methods=["GET"])
def manage_reviews():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        text = sanitize_input(data.get("text", ""), 500)
        stars = data.get("stars", 0)
        username = sanitize_input(data.get("username", "Anonymous"), 50)
        
        try:
            stars = int(stars)
            if stars < 1 or stars > 5: raise ValueError
        except:
            return jsonify({"success": False, "message": "Rating must be between 1 and 5"}), 400
        
        if not text:
            return jsonify({"success": False, "message": "Review text is required"}), 400
        
        reviews = load_data(REVIEW_FILE)
        new_review = {
            "id": len(reviews) + 1,
            "username": username,
            "text": text,
            "stars": stars,
            "createdAt": datetime.datetime.now().strftime("%b %d, %Y"),
            "status": "approved"
        }
        reviews.append(new_review)
        if save_data(REVIEW_FILE, reviews):
            return jsonify({"success": True, "message": "Review added!"})
        else:
            return jsonify({"success": False, "message": "Server storage error"}), 500
    
    # GET method
    reviews = load_data(REVIEW_FILE)
    return jsonify(reviews)

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

@app.after_request
def add_header(response):
    # Cache static assets (images, css, js) for 1 hour for better performance
    if 'Cache-Control' not in response.headers:
        if request.path.startswith('/static/'):
            response.headers['Cache-Control'] = 'public, max-age=3600'
        else:
            response.headers['Cache-Control'] = 'no-store'
    return response

# --- Initial Setup ---
if not os.path.exists("data"):
    os.makedirs("data")
for f_path in [QUESTION_FILE, REVIEW_FILE]:
    if not os.path.exists(f_path):
        with open(f_path, "w") as f:
            json.dump([], f)

if __name__ == '__main__':
    # Local development: debug enabled
    app.run(debug=True, port=5000)
