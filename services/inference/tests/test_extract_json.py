# services/inference/tests/test_extract_json.py
"""Tests for extract_json() -- the fragile boundary between model output and structured data."""
import json
import pytest
from harness import extract_json


class TestValidJson:
    def test_plain_object(self):
        raw = '{"key": "value"}'
        assert extract_json(raw) == '{"key": "value"}'

    def test_plain_array(self):
        raw = '[{"a": 1}]'
        assert extract_json(raw) == '[{"a": 1}]'

    def test_nested_object(self):
        raw = '{"a": {"b": [1, 2, 3]}}'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"a": {"b": [1, 2, 3]}}


class TestMarkdownFences:
    def test_json_tagged_fence(self):
        raw = '```json\n{"key": "value"}\n```'
        assert extract_json(raw) == '{"key": "value"}'

    def test_untagged_fence(self):
        raw = '```\n{"key": "value"}\n```'
        assert extract_json(raw) == '{"key": "value"}'

    def test_fence_with_leading_whitespace(self):
        raw = '```json\n  {"key": "value"}  \n```'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"key": "value"}

    def test_fence_with_array(self):
        raw = '```json\n[1, 2, 3]\n```'
        assert extract_json(raw) == '[1, 2, 3]'


class TestProseStripping:
    def test_leading_prose(self):
        raw = 'Here is the result:\n{"key": "value"}'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"key": "value"}

    def test_trailing_prose(self):
        # When text starts with '{', extract_json returns it as-is after
        # trailing-comma repair (early return at line 1152-1155). Trailing
        # prose is NOT stripped in this code path.
        raw = '{"key": "value"}\nI hope this helps!'
        result = extract_json(raw)
        assert result == '{"key": "value"}\nI hope this helps!'

    def test_both_leading_and_trailing(self):
        raw = 'Sure!\n{"key": "value"}\nLet me know.'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"key": "value"}

    def test_json_inside_paragraphs(self):
        raw = 'The answer is:\n\n{"key": "val"}\n\nAbove is the JSON.'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"key": "val"}


class TestTrailingCommaRepair:
    def test_trailing_comma_in_object(self):
        raw = '{"a": 1, "b": 2,}'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"a": 1, "b": 2}

    def test_trailing_comma_in_array(self):
        raw = '[1, 2, 3,]'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == [1, 2, 3]

    def test_nested_trailing_commas(self):
        raw = '{"a": [1, 2,], "b": 3,}'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"a": [1, 2], "b": 3}


class TestEdgeCases:
    def test_empty_string(self):
        result = extract_json("")
        assert result == ""

    def test_whitespace_only(self):
        result = extract_json("   \n\n  ")
        assert result == ""

    def test_no_json_at_all(self):
        raw = "Just some text with no structure."
        result = extract_json(raw)
        assert result == raw.strip()

    def test_multiline_json_object(self):
        raw = '{\n  "name": "test",\n  "value": 42\n}'
        result = extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"name": "test", "value": 42}

    def test_truncated_json_returns_without_raising(self):
        # extract_json does NOT validate JSON parseability — callers must
        # handle json.JSONDecodeError downstream. This documents the contract.
        raw = '{"key": "val'
        result = extract_json(raw)
        assert result == raw
        with pytest.raises(json.JSONDecodeError):
            json.loads(result)
