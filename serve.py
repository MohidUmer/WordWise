from waitress import serve
from app import app
import logging

# Configure logging for production
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('waitress')

if __name__ == '__main__':
    logger.info("Starting WordWise production server on http://0.0.0.0:8080")
    serve(app, host='0.0.0.0', port=8080)
