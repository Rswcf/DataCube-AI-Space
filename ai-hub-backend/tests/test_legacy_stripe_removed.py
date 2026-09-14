"""The unauthenticated legacy Stripe endpoints are gone (SP3a re-introduces payments)."""

from app.main import app


def test_no_route_is_registered_under_api_stripe():
    paths = {getattr(route, "path", "") for route in app.routes}
    assert not [path for path in paths if path.startswith("/api/stripe")]


def test_openapi_schema_has_no_stripe_paths():
    assert not [path for path in app.openapi()["paths"] if path.startswith("/api/stripe")]
