"""Log lines never carry full email addresses."""

from app.services.privacy import mask_email, redact_emails


def test_mask_email_keeps_only_first_character_and_domain():
    assert mask_email("jane.doe@example.com") == "j***@example.com"
    assert mask_email("  Jane@Example.com ") == "J***@Example.com"


def test_mask_email_handles_missing_or_malformed_values():
    assert mask_email(None) == "<no-email>"
    assert mask_email("") == "<no-email>"
    assert mask_email("not-an-email") == "<no-email>"
    assert mask_email("@example.com") == "<no-email>"


def test_redact_emails_replaces_addresses_in_free_text():
    assert redact_emails('Invalid `to` field: "reader@example.com"') == 'Invalid `to` field: "<email>"'
    assert redact_emails("no address here") == "no address here"
