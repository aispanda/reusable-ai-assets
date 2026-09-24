"""Pure configuration checks; Flask HTTP tests are optional if Flask is absent."""
import importlib.util
import unittest

from blog_redirect import create_blog_blueprint, normalize_blog_origin

FLASK_AVAILABLE = importlib.util.find_spec("flask") is not None


class OriginTests(unittest.TestCase):
    def test_normalized_explicit_origin(self):
        self.assertEqual(normalize_blog_origin("https://BLOG.JOURNAL.EXAMPLE:443/"), "https://blog.journal.example")
        self.assertEqual(normalize_blog_origin("https://blog.journal.example:8443"), "https://blog.journal.example:8443")
        self.assertEqual(normalize_blog_origin("https://[::1]:8443/"), "https://[::1]:8443")

    def test_unsafe_or_missing_origins_rejected(self):
        for value in (None, "", "/blog", "//blog.example", "http://blog.example",
                      "javascript:alert(1)", "https://user:secret@blog.example", "https://@blog.example",
                      "https://blog.example/path", "https://blog.example?next=elsewhere", "https://blog.example#token",
                      "https://blog.example?", "https://blog.example#", "https://blog.example\n",
                      "https://blog.example:0", "https://blog.example:65536", "https://blog.example:notaport",
                      "https://blog\\.example", "https://bad_host.example"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_blog_origin(value)

    def test_route_validation_runs_before_optional_flask_import(self):
        for route in ("/", "//other", "relative", "/<path:rest>", "/community?next=elsewhere", "/community#fragment"):
            with self.subTest(route=route), self.assertRaises(ValueError):
                create_blog_blueprint("https://blog.journal.example", route=route)


@unittest.skipUnless(FLASK_AVAILABLE, "Flask is target-owned and unavailable; HTTP adapter execution UNPROVEN")
class FlaskTests(unittest.TestCase):
    def setUp(self):
        from flask import Flask
        self.app = Flask(__name__)
        self.app.config["TESTING"] = True

    def test_fixed_redirect_ignores_user_destination_and_token_parameters(self):
        self.app.register_blueprint(create_blog_blueprint("https://blog.journal.example"))
        response = self.app.test_client().get("/community?next=https://other.example&token=must-not-forward")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "https://blog.journal.example/")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")
        self.assertNotIn("Set-Cookie", response.headers)
        self.assertEqual(self.app.test_client().post("/community").status_code, 405)

    def test_explicit_configurable_route(self):
        self.app.register_blueprint(create_blog_blueprint("https://blog.journal.example", route="/articles", name="articles"))
        self.assertEqual(self.app.test_client().get("/articles").status_code, 302)
        self.assertEqual(self.app.test_client().get("/community").status_code, 404)

    def test_existing_application_routes_are_not_shadowed(self):
        self.app.add_url_rule("/community", endpoint="existing", view_func=lambda: "Existing application")
        with self.assertRaisesRegex(ValueError, "shadow"):
            self.app.register_blueprint(create_blog_blueprint("https://blog.journal.example"))


if __name__ == "__main__":
    unittest.main(verbosity=1)
