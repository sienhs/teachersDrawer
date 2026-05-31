"""
hwp-parser 통합 테스트.

실행 방법:
  cd hwp-parser
  pytest tests/ -v

HWP 파일이 없으면 해당 테스트는 자동 skip 됩니다.
파일 위치 재지정: SAMPLES_DIR 환경 변수 사용
  SAMPLES_DIR=/path/to/hwp pytest tests/ -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from parser.activity_plan import parse_activity_plan  # noqa: E402

# ──────────────────────────────────────────
# 경로 설정
# ──────────────────────────────────────────

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_SAMPLES = os.path.join(_REPO_ROOT, "samples", "hwp")
SAMPLES_DIR = os.environ.get("SAMPLES_DIR", _DEFAULT_SAMPLES)

CASE_5_8 = os.path.join(SAMPLES_DIR, "CASE_5_8.hwp")
CASE_5_26 = os.path.join(SAMPLES_DIR, "CASE_5_26.hwp")

_SKIP_5_8 = pytest.mark.skipif(
    not os.path.exists(CASE_5_8),
    reason=f"CASE_5_8.hwp 없음 ({CASE_5_8})",
)
_SKIP_5_26 = pytest.mark.skipif(
    not os.path.exists(CASE_5_26),
    reason=f"CASE_5_26.hwp 없음 ({CASE_5_26})",
)


# ──────────────────────────────────────────
# CASE_5_8 검증 (2026-05-08, 경청, 열성반)
# ──────────────────────────────────────────

@_SKIP_5_8
def test_case_5_8_metadata():
    result = parse_activity_plan(CASE_5_8)
    meta = result["metadata"]
    assert meta["planDate"] == "2026-05-08", f"planDate 불일치: {meta['planDate']}"
    assert meta["subject"] == "경청", f"subject 불일치: {meta['subject']}"
    assert meta["classNameRaw"] == "열성반", f"classNameRaw 불일치: {meta['classNameRaw']}"


@_SKIP_5_8
def test_case_5_8_sections_count():
    result = parse_activity_plan(CASE_5_8)
    count = len(result["sections"])
    assert count >= 11, f"sections {count}개 (기대 11개 이상)"


@_SKIP_5_8
def test_case_5_8_section_categories():
    result = parse_activity_plan(CASE_5_8)
    categories = {s["category"] for s in result["sections"]}
    assert "MORNING" in categories, "MORNING 카테고리 없음"
    assert "EVALUATION" in categories, "EVALUATION 카테고리 없음"


@_SKIP_5_8
def test_case_5_8_montessori_count():
    result = parse_activity_plan(CASE_5_8)
    count = len(result["montessoriRecords"])
    assert count >= 17, f"montessoriRecords {count}개 (기대 17개 이상)"


@_SKIP_5_8
def test_case_5_8_montessori_fields():
    result = parse_activity_plan(CASE_5_8)
    for rec in result["montessoriRecords"]:
        assert "childNameRaw" in rec
        assert "area" in rec
        assert "material" in rec
        assert "confirmed" in rec


@_SKIP_5_8
def test_case_5_8_raw_json():
    result = parse_activity_plan(CASE_5_8)
    import json
    raw = json.loads(result["rawJson"])
    assert raw["table_count"] >= 2
    assert len(raw["tables"]) >= 2


# ──────────────────────────────────────────
# CASE_5_26 검증 (같은 양식, 다른 날짜)
# ──────────────────────────────────────────

@_SKIP_5_26
def test_case_5_26_metadata_basic():
    result = parse_activity_plan(CASE_5_26)
    meta = result["metadata"]
    assert meta["planDate"], "planDate 비어있음"
    assert meta["classNameRaw"], "classNameRaw 비어있음"


@_SKIP_5_26
def test_case_5_26_sections_count():
    result = parse_activity_plan(CASE_5_26)
    count = len(result["sections"])
    assert count >= 11, f"sections {count}개 (기대 11개 이상)"


@_SKIP_5_26
def test_case_5_26_montessori_count():
    result = parse_activity_plan(CASE_5_26)
    count = len(result["montessoriRecords"])
    assert count >= 1, "montessoriRecords 없음"
