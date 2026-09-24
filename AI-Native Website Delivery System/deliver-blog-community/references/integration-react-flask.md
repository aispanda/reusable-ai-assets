# React/Vite and Flask: standalone blog navigation

These optional adapters connect an existing application to a separately hosted
blog service through ordinary page navigation. The blog service retains its own
editor, published pages, authenticated APIs, Firebase Auth and server-side roles.
This is the `react-vite-flask+blog-service` profile, not a native Flask rewrite or a
React editor extraction. Installation and real target-browser behavior require
consumer verification; these adapters alone do not deploy or configure the service.

## React/Vite

Copy `assets/integrations/BlogNavigation.jsx` and `blog-origin.mjs` together into a
consumer-owned component directory after checking for existing files. React and
the JSX build pipeline belong to that application. Render the component with an
explicit public HTTPS blog origin from target configuration:

```jsx
import BlogNavigation from './components/BlogNavigation.jsx';

<BlogNavigation blogOrigin={import.meta.env.VITE_BLOG_ORIGIN} />
```

The component links to blog home `/`, authoring `/studio`, and account
`/account`. These match the shipped runtime pages. It uses anchors and full-page navigation, with no iframe,
client-router interception, cross-origin credential requests or session/token
transfer. It rejects missing origins, credentials, query/fragment payloads, and
subpath bases. Its account link does not automatically sign users in; the blog
service performs its own approved Google sign-in and checks current permissions.
Style the semantic navigation in the target's existing design system. Configure
the actual origin; no default project or production destination is supplied.

## Flask

Copy `assets/integrations/blog_redirect.py` into the consuming Flask application.
The factory imports Flask only when invoked; this package does not install it.
Register one explicitly configured navigation route:

```python
from blog_redirect import create_blog_blueprint

app.register_blueprint(create_blog_blueprint(app.config["BLOG_ORIGIN"]))
```

Default `/community` returns a temporary redirect to the configured HTTPS blog
home. To use another unused route, pass `route="/articles"` and a distinct blueprint
name when necessary. An existing route is rejected rather than shadowed. The
factory never reads a user-supplied destination, query token, session or cookie,
never proxies requests, and never grants CORS access. Runtime origin validation
uses Python's standard library. Existing auth and Flask APIs remain target-owned.

## Target-owned prerequisites and verification

Confirm the exact blog origin and source package version; isolated Firebase/data
boundary; initial Admin authority; OAuth provider and allowed callback domains;
existing users and any shared-identity requirement; route ownership; and staging
release authority. These adapters do not create infrastructure, DNS, OAuth settings,
roles or accounts. A profile value is not permission to configure them. If a target
requires one unified login or same-origin routing, define and test that separate
integration before claiming either behavior. Do not copy browser sessions between
the host application and blog service.

Run the provided checks from this capability directory:

```sh
node --test assets/integrations/test_blog_navigation.mjs
python -B assets/integrations/test_blog_redirect.py
```

The Node tests execute actual link/origin functions, not React rendering. The
Python tests always execute pure origin/route validation. Flask HTTP tests run only
when Flask is already available, otherwise report SKIP/UNPROVEN. In the consumer,
build the actual React component, open each link, test the Flask redirect, sign in
through the blog, and check the allowed/denied role journey. No compile or HTTP
helper test alone proves a live consumer installation or shared authentication.
