"""Optional Flask entry-point redirect; no reverse proxy, tokens or shared sessions."""
import ipaddress
import re
from urllib.parse import urlsplit


def normalize_blog_origin(value):
    """Validate target-owned HTTPS origin using only Python's standard library."""
    if (not isinstance(value, str) or not value or any(c.isspace() for c in value)
            or "?" in value or "#" in value):
        raise ValueError("blog_origin must be an explicit HTTPS origin without whitespace, query or fragment")
    try:
        url = urlsplit(value)
        port = url.port
        if (url.scheme != "https" or not url.hostname or "@" in url.netloc
                or url.path not in ("", "/") or (port is not None and port < 1)):
            raise ValueError("expected an HTTPS host and optional port only")
        hostname = url.hostname
        try:
            address = ipaddress.ip_address(hostname)
            host = f"[{address.compressed}]" if address.version == 6 else str(address)
        except ValueError:
            host = hostname.encode("idna").decode("ascii").lower()
            if (len(host) > 253 or not re.fullmatch(
                    r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?", host)):
                raise ValueError("invalid hostname")
        return "https://" + host + (f":{port}" if port not in (None, 443) else "")
    except (ValueError, UnicodeError) as error:
        raise ValueError("blog_origin must be a valid HTTPS origin") from error


def create_blog_blueprint(blog_origin, *, route="/community", name="blog_community"):
    """Redirect GET/HEAD on one explicit route to a separately hosted blog home."""
    origin = normalize_blog_origin(blog_origin)
    if not isinstance(route, str) or not re.fullmatch(r"/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*/?", route):
        raise ValueError("route must be an explicit non-root path without parameters")
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", name):
        raise ValueError("name must be a valid unique blueprint identifier")
    # Flask belongs to the consuming application; pure origin tests need no Flask.
    from flask import Blueprint, redirect

    blueprint = Blueprint(name, __name__)

    @blueprint.record_once
    def reject_existing_route(state):
        effective_route = (state.url_prefix or "").rstrip("/") + route
        if any(rule.rule == effective_route for rule in state.app.url_map.iter_rules()):
            raise ValueError(f"Refusing to shadow an existing route: {effective_route}")

    def go_to_blog():
        # Do not read request args, headers, cookies or sessions. This is fixed config.
        response = redirect(origin + "/", code=302)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    blueprint.add_url_rule(route, endpoint="home", view_func=go_to_blog, methods=["GET"])
    return blueprint
