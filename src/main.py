from pathlib import Path
from flask import Flask, render_template, request, redirect, url_for

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / 'templates'

app = Flask(__name__, template_folder=str(TEMPLATE_DIR))

# Mock user data for demonstration purposes
users = {
    'admin': 'admin',
    'user1': 'password1',
    'user2': 'password2'
}


@app.route('/')
def home():
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if username in users and users[username] == password:
            return redirect(url_for('dashboard', username=username))

        error = 'Invalid credentials. Please try again.'

    return render_template('login.html', error=error)


@app.route('/dashboard/<username>')
def dashboard(username):
    return render_template('dashboard.html', username=username)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)