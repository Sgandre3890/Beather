import os
from flask import Flask

app = Flask(__name__)


@app.route('/')
def home():
    return 'Hello creatures'


if __name__ == '__main__':
    # Read host and port from environment so the app can be configured when deployed or run locally.
    host = os.environ.get('HOST', '0.0.0.0')
    try:
        port = int(os.environ.get('PORT', 5000))
    except ValueError:
        port = 5000

    # FLASK_DEBUG can be '1' or 'true' (case insensitive) to enable debug mode.
    debug_env = os.environ.get('FLASK_DEBUG', '')
    debug = debug_env == '1' or debug_env.lower() == 'true'

    # Run the Flask development server. Binding to 0.0.0.0 allows access from other machines
    # on the same network (ensure firewall/port forwarding allows it).
    app.run(host=host, port=port, debug=debug)