# Word Wise

Word Wise is a smart grammar helper web application that helps users improve their writing with real-time feedback, grammar checks, and vocabulary suggestions.

## Features
- **Smart Grammar Detection**: Real-time error detection.
- **Helpful Suggestions**: Actionable improvements for your writing.
- **Multi-Platform Access**: Works on desktop and mobile.
- **Fast & Secure**: Private and secure text analysis.

## Project Structure
- `app.py`: Flask backend server.
- `html/`: Contains all HTML frontend files.
- `css/`: Contains styling files.
- `images/`: Contains image assets.
- `js/`: JavaScript files (currently embedded in HTML, folder reserved for future use).
- `data/`: JSON and text data files.

## How to Run
1. Ensure you have Python installed.
2. Install dependencies:
   ```bash
   pip install flask flask-cors
   ```
3. Run the application:
   ```bash
   python app.py
   ```
4. Open `html/main.html` in your browser or navigate to the localhost URL if served via Flask (Note: current setup uses `app.py` as an API backend, so you can open `html/main.html` directly or serve it).

## Technologies
- HTML, CSS (Tailwind), JavaScript
- Python (Flask)
