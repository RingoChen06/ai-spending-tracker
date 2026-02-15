from backend.app import app

class ProxyMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        if path.startswith('/api'):
            environ['PATH_INFO'] = path[4:]
        return self.app(environ, start_response)

# Apply the middleware to strip '/api' prefix
app.wsgi_app = ProxyMiddleware(app.wsgi_app)
