"""One-click unsubscribe tokens round-trip, resist tampering and fail closed."""

from types import SimpleNamespace

from app.services.unsubscribe_tokens import mint_token, verification_keys, verify_token

SECRET = "s" * 40
OLD_SECRET = "o" * 40
SUBSCRIPTION_ID = "sub_3f6a7c1e-1b2c-4d5e-8f90-123456789abc"


def test_token_round_trips_to_the_subscription_id():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    assert token.startswith("v1.")
    assert verify_token(token, [SECRET]) == SUBSCRIPTION_ID


def test_token_contains_no_email_and_is_url_safe():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    assert "@" not in token
    assert all(ch.isalnum() or ch in "._-" for ch in token)


def test_tampered_tokens_are_rejected():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    version, kid, subscription_id, signature = token.split(".")
    other_signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    assert verify_token(f"{version}.{kid}.sub_other.{signature}", [SECRET]) is None
    assert verify_token(f"{version}.{kid}.{subscription_id}.{other_signature}", [SECRET]) is None
    assert verify_token(token + "\n", [SECRET]) is None
    assert verify_token("", [SECRET]) is None
    assert verify_token(None, [SECRET]) is None


def test_verification_fails_closed_without_usable_keys():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    assert verify_token(token, []) is None
    assert verify_token(token, ["short"]) is None


def test_previous_secret_still_verifies_during_rotation():
    old_token = mint_token(SUBSCRIPTION_ID, OLD_SECRET)
    assert verify_token(old_token, [SECRET, OLD_SECRET]) == SUBSCRIPTION_ID
    assert verify_token(old_token, [SECRET]) is None


def test_minting_needs_a_usable_secret_and_a_plain_subscription_id():
    assert mint_token(SUBSCRIPTION_ID, "") is None
    assert mint_token(SUBSCRIPTION_ID, "too-short") is None
    assert mint_token("", SECRET) is None
    assert mint_token(None, SECRET) is None
    assert mint_token("sub/../../admin", SECRET) is None


def test_verification_keys_need_a_usable_current_secret():
    assert verification_keys(SimpleNamespace(signing_secret=SECRET, signing_secret_previous="")) == [SECRET]
    assert verification_keys(SimpleNamespace(signing_secret=SECRET, signing_secret_previous=OLD_SECRET)) == [SECRET, OLD_SECRET]
    assert verification_keys(SimpleNamespace(signing_secret=SECRET, signing_secret_previous="short")) == [SECRET]
    assert verification_keys(SimpleNamespace(signing_secret="short", signing_secret_previous=OLD_SECRET)) == []
    assert verification_keys(SimpleNamespace(signing_secret="", signing_secret_previous=OLD_SECRET)) == []
