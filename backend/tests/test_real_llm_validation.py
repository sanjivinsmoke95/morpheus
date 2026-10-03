"""Test suite for Real LLM schema validation, repair loops, and abstention markers."""

from pydantic import BaseModel, Field

from app.services.ai.real import _validate_with_schema, OpenAICompatibleLLM


class SampleTenderSpec(BaseModel):
    is_number: str
    applicability: str
    confidence: float = Field(ge=0.0, le=1.0)


def test_schema_validation_success():
    raw_data = {"is_number": "IS 1180 : 2014", "applicability": "DIRECTLY_APPLICABLE", "confidence": 0.95}
    data, valid, err = _validate_with_schema(raw_data, SampleTenderSpec)
    assert valid is True
    assert err == ""
    assert data["is_number"] == "IS 1180 : 2014"


def test_schema_validation_failure_missing_field():
    raw_data = {"is_number": "IS 1180 : 2014"}  # missing applicability & confidence
    data, valid, err = _validate_with_schema(raw_data, SampleTenderSpec)
    assert valid is False
    assert "validation failed" in err.lower()


def test_schema_validation_failure_invalid_type():
    raw_data = {"is_number": "IS 1180 : 2014", "applicability": "DIRECTLY_APPLICABLE", "confidence": "high"}
    data, valid, err = _validate_with_schema(raw_data, SampleTenderSpec)
    assert valid is False


def test_dict_schema_validation():
    dict_schema = {"type": "object", "required": ["is_number", "sector"]}
    valid_data, ok, _ = _validate_with_schema({"is_number": "IS 456", "sector": "civil"}, dict_schema)
    assert ok is True

    invalid_data, ok, err = _validate_with_schema({"is_number": "IS 456"}, dict_schema)
    assert ok is False
    assert "sector" in err


def test_abstention_return_on_complete_failure():
    llm = OpenAICompatibleLLM(api_key="mock", base_url="http://mock.endpoint", model="test")
    # Mock _chat to always return invalid json
    llm._chat = lambda prompt, temperature: "I cannot produce valid json here."
    result = llm.complete_json("dummy prompt", schema=SampleTenderSpec, max_retries=1)
    assert result.get("_abstain") is True
    assert "_error" in result
