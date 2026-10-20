from flask import Flask, request, render_template_string, abort, send_from_directory
import json
import os

app = Flask(__name__)

def load_tokens():
    path = os.path.join(os.path.dirname(__file__), '..', 'tokens.json')
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

# Ruta para servir los archivos estáticos desde la carpeta public
@app.route('/public/<path:path>')
def send_static(path):
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'public'), path)

@app.route('/')
def serve_app():
    token = request.args.get('token')
    valid_tokens = load_tokens()
    
    if not token or token not in valid_tokens:
        return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head><title>Acceso Denegado</title></head>
            <body style="font-family: sans-serif; text-align: center; margin-top: 100px;">
                <h1 style="color: red;">Acceso Restringido 🚫</h1>
                <p>Necesitas un enlace de invitación válido con un identificador único para ingresar.</p>
            </body>
            </html>
        '''), 403
    
    html_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'Fulbito5.html')
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return html_content
    except Exception as e:
        return f"Error al cargar la aplicación: {str(e)}", 500
