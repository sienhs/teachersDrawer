"""
꿈열매유치원 일일놀이실행안 HWP 파싱 모듈.

알고리즘 개요:
  1. hwp5html --output {dir} {file} 로 XHTML 변환
  2. BeautifulSoup 으로 class='TableControl' 최상위 테이블 추출 (보통 3개)
     - 테이블 #0 : 결제란  → teacherName
     - 테이블 #1 : 본문    → metadata + sections + montessoriRecords
     - 테이블 #2 : 방과후  (현재는 rawJson 에만 포함)
  3. 본문 테이블
     - 행 0 : 라벨·값 교대로 가로 페어링 (일시/학급명/수업시간/수업일수)
     - 행 1~ : 첫 셀=label, 두 번째 셀=content
     - "주제" 라벨 → metadata.subject
     - "몬테소리" 포함 라벨 → 중첩 table 별도 추출 → montessoriRecords
"""

import json
import os
import re
import subprocess
import tempfile
import warnings
from pathlib import Path

from bs4 import BeautifulSoup, Tag, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)


# ──────────────────────────────────────────
# 텍스트 헬퍼
# ──────────────────────────────────────────

def _norm(text: str) -> str:
    """공백 완전 제거 — 라벨 키 매칭 전용."""
    return re.sub(r"\s+", "", text)


def _norm_label(text: str) -> str:
    """다중 공백→단일 공백, 앞뒤 제거 — 라벨 저장 및 값 정규화."""
    return re.sub(r"\s+", " ", text).strip()


def _norm_content(text: str) -> str:
    """줄 단위 공백 정리, 빈 줄 제거 — 활동 내용 저장."""
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def _cell_key(cell: Tag) -> str:
    return _norm(cell.get_text())


def _cell_label(cell: Tag) -> str:
    return _norm_label(cell.get_text())


def _cell_content(cell: Tag) -> str:
    return _norm_content(cell.get_text(separator="\n"))


# ──────────────────────────────────────────
# 카테고리 매핑
# ──────────────────────────────────────────

_CATEGORY_RULES: list[tuple[list[str], str]] = [
    (["등원", "출석"], "MORNING"),
    (["나침반", "안전교육", "안전", "화재대피"], "SAFETY"),
    (["점심", "식사", "급식"], "LUNCH"),
    (["바깥놀이", "운동장"], "OUTDOOR"),
    (["평가", "일일평가"], "EVALUATION"),
]


def _map_category(label: str) -> str:
    key = _norm(label)
    for keywords, category in _CATEGORY_RULES:
        for kw in keywords:
            if kw in key:
                return category
    return "OTHER"


# ──────────────────────────────────────────
# HWP → XHTML 변환
# ──────────────────────────────────────────

def _hwp_to_html(hwp_path: str) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            result = subprocess.run(
                ["hwp5html", "--output", tmpdir, hwp_path],
                capture_output=True,
                text=True,
                timeout=60,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "hwp5html 명령을 찾을 수 없습니다. "
                "pyhwp 가 올바르게 설치되었는지 확인하세요."
            )

        if result.returncode != 0:
            raise RuntimeError(
                f"hwp5html 변환 실패 (종료코드 {result.returncode}).\n"
                f"stderr: {result.stderr[:600]}"
            )

        files = sorted(Path(tmpdir).iterdir())
        html_file = next(
            (f for f in files if f.suffix.lower() in (".xhtml", ".html")),
            None,
        )
        if html_file is None:
            raise RuntimeError(
                f"변환 결과 HTML 파일 없음. "
                f"생성된 파일 목록: {[f.name for f in files]}"
            )

        return html_file.read_text(encoding="utf-8")


# ──────────────────────────────────────────
# 테이블 추출
# ──────────────────────────────────────────

def _find_top_level_tables(soup: BeautifulSoup) -> list[Tag]:
    """class='TableControl' 테이블 중 최상위(중첩 아닌) 것만 반환."""
    tables = soup.find_all("table", class_="TableControl")
    if not tables:
        raise RuntimeError(
            "class='TableControl' 테이블을 찾을 수 없습니다. "
            "pyhwp 버전 또는 HWP 양식이 예상과 다를 수 있습니다. "
            "rawJson 을 직접 확인해 실제 class 이름을 확인하세요."
        )
    return [t for t in tables if not t.find_parent("table", class_="TableControl")]


def _rows(table: Tag) -> list[Tag]:
    """직접 자식 행만 반환 — 중첩 테이블의 tr 미포함."""
    result: list[Tag] = []
    for child in table.children:
        if not hasattr(child, "name"):
            continue
        if child.name == "tr":
            result.append(child)
        elif child.name in ("tbody", "thead", "tfoot"):
            for gc in child.children:
                if hasattr(gc, "name") and gc.name == "tr":
                    result.append(gc)
    return result


def _cells(row: Tag) -> list[Tag]:
    return row.find_all(["td", "th"], recursive=False)


# ──────────────────────────────────────────
# 결제란(#0) → 담당 교사명
# ──────────────────────────────────────────

def _extract_teacher_name(table: Tag) -> str:
    """
    결제란 테이블에서 "담당" 셀을 찾고,
    같은 행의 다음 셀 또는 다음 행의 같은 열에서 교사명을 반환.
    """
    all_rows = _rows(table)
    for row_idx, row in enumerate(all_rows):
        row_cells = _cells(row)
        for col_idx, cell in enumerate(row_cells):
            if "담당" not in _cell_key(cell):
                continue
            # 같은 행 다음 셀 우선
            if col_idx + 1 < len(row_cells):
                candidate = _cell_label(row_cells[col_idx + 1])
                if candidate and candidate not in ("담당", "원감", "원장"):
                    return candidate
            # 다음 행: rowspan 병합 셀이 있으면 실제 td 수가 줄어들 수 있으므로
            # col_idx 와 len-1 중 작은 값으로 보정 후 오른쪽부터 탐색
            if row_idx + 1 < len(all_rows):
                next_cells = _cells(all_rows[row_idx + 1])
                idx = min(col_idx, len(next_cells) - 1)
                if idx >= 0 and _cell_label(next_cells[idx]):
                    return _cell_label(next_cells[idx])
                # 보정 인덱스 셀이 비어있으면 비어있지 않은 마지막 셀
                for nc in reversed(next_cells):
                    candidate = _cell_label(nc)
                    if candidate and candidate not in ("담당", "원감", "원장"):
                        return candidate
    return ""


# ──────────────────────────────────────────
# 메타정보 행(행 0) 파싱
# ──────────────────────────────────────────

def _parse_plan_date(text: str) -> str:
    """날짜 텍스트를 YYYY-MM-DD 형식으로 변환 (숫자 구분자 / 한글 형식 모두 처리)."""
    key = _norm(text)
    # 숫자 구분자: 2026.05.08 / 2026-05-08 / 2026/05/08
    m = re.search(r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})", key)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
    # 한글 형식: 2026년5월8일(월요일)
    m = re.search(r"(\d{4})년(\d{1,2})월(\d{1,2})일", key)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
    return _norm_label(text)


def _parse_day_count(text: str) -> int:
    m = re.search(r"\d+", text)
    return int(m.group()) if m else 0


_META_LABEL_FIELDS: list[tuple[str, str]] = [
    ("일시", "planDate"),
    ("학급명", "classNameRaw"),
    ("수업시간", "classTimeRaw"),
    ("수업일수", "classDayCount"),
]


def _parse_metadata_row(row: Tag) -> dict:
    cells = _cells(row)
    meta: dict = {
        "planDate": "",
        "subject": "",
        "teacherName": "",
        "classNameRaw": "",
        "classTimeRaw": "",
        "classDayCount": 0,
    }

    i = 0
    while i < len(cells):
        key = _cell_key(cells[i])
        field = next((f for lbl, f in _META_LABEL_FIELDS if lbl in key), None)

        if field and i + 1 < len(cells):
            raw = cells[i + 1].get_text(separator=" ").strip()
            if field == "planDate":
                meta[field] = _parse_plan_date(raw)
            elif field == "classDayCount":
                meta[field] = _parse_day_count(raw)
            else:
                meta[field] = _norm_label(raw)
            i += 2
        else:
            i += 1

    return meta


# ──────────────────────────────────────────
# 몬테소리 중첩 테이블 파싱
# ──────────────────────────────────────────

def _parse_montessori_table(table: Tag) -> list[dict]:
    """
    [이름 | 영역 | 교구명 | 확인] 헤더 다음 행들을 레코드로 변환.
    헤더 행은 텍스트가 없거나 "이름"/"영역" 등 고정 단어일 때 건너뜀.
    """
    records: list[dict] = []
    all_rows = _rows(table)
    if not all_rows:
        return records

    # 첫 행이 헤더인지 판단: "이름", "영역", "교구" 중 하나 포함 시 건너뜀
    start = 0
    first_texts = [_norm(c.get_text()) for c in _cells(all_rows[0])]
    if any(kw in t for t in first_texts for kw in ("이름", "영역", "교구")):
        start = 1

    for row in all_rows[start:]:
        row_cells = _cells(row)
        texts = [c.get_text(separator=" ").strip() for c in row_cells]
        if not any(texts):
            continue
        records.append({
            "childNameRaw": texts[0] if len(texts) > 0 else "",
            "area": texts[1] if len(texts) > 1 else "",
            "material": texts[2] if len(texts) > 2 else "",
            "confirmed": texts[3] if len(texts) > 3 else "",
        })

    return records


# ──────────────────────────────────────────
# 본문 테이블(#1) 파싱
# ──────────────────────────────────────────

_HEADER_LABELS = {"활동계획", "활동내용", "구분", "시간"}


def _parse_main_table(table: Tag) -> tuple[dict, list[dict], list[dict]]:
    all_rows = _rows(table)
    if not all_rows:
        raise RuntimeError("본문 테이블(#1)에 행이 없습니다.")

    # 행 0: 메타정보
    metadata = _parse_metadata_row(all_rows[0])

    sections: list[dict] = []
    montessori: list[dict] = []
    order_index = 0

    for row_idx in range(1, len(all_rows)):
        row = all_rows[row_idx]
        row_cells = _cells(row)
        if not row_cells:
            continue

        label_key = _cell_key(row_cells[0])
        label_display = _cell_label(row_cells[0])

        if not label_key:
            continue

        # 헤더 행 건너뜀 (라벨이 "활동계획" 등인 경우)
        if label_key in _HEADER_LABELS:
            continue

        content_cell = row_cells[1] if len(row_cells) > 1 else None

        # "주제" → metadata.subject
        if "주제" in label_key:
            if content_cell:
                metadata["subject"] = _norm_label(content_cell.get_text())
            else:
                raw = _norm_label(row_cells[0].get_text())
                metadata["subject"] = re.sub(r"^주제\s*[:：]?\s*", "", raw)
            continue

        content = _cell_content(content_cell) if content_cell else ""

        # 몬테소리: 라벨 이후 모든 셀의 모든 중첩 테이블을 탐색.
        # 헤더 셀이 {"이름","영역","교구명","교구","확인"} 중 2개 이상 정확 일치하는
        # 테이블 우선 선택 → fallback: 첫 번째 중첩 테이블.
        # (교구소개 설명 셀과 아동 기록 셀이 공존하는 3열 구조도 처리)
        if "몬테소리" in label_key:
            _RECORD_HEADER = {"이름", "영역", "교구명", "교구", "확인"}
            target_table = None
            fallback_table = None
            for cell in row_cells[1:]:
                for nt in cell.find_all("table"):
                    if fallback_table is None:
                        fallback_table = nt
                    nt_rows = _rows(nt)
                    if not nt_rows:
                        continue
                    first_texts = {_norm(c.get_text()) for c in _cells(nt_rows[0])}
                    if len(first_texts & _RECORD_HEADER) >= 2:
                        target_table = nt
                        break
                if target_table:
                    break
            chosen = target_table or fallback_table
            if chosen:
                montessori = _parse_montessori_table(chosen)

        sections.append({
            "orderIndex": order_index,
            "label": label_display,
            "content": content,
            "category": _map_category(label_display),
        })
        order_index += 1

    return metadata, sections, montessori


# ──────────────────────────────────────────
# 공개 진입점
# ──────────────────────────────────────────

def parse_activity_plan(hwp_path: str) -> dict:
    """
    HWP 파일을 파싱하여 구조화 JSON 을 반환.

    반환 구조:
      metadata        : planDate / subject / teacherName / classNameRaw /
                        classTimeRaw / classDayCount
      sections        : [{orderIndex, label, content, category}, ...]
      montessoriRecords : [{childNameRaw, area, material, confirmed}, ...]
      rawJson         : 원본 셀 텍스트 전체 직렬화 (재처리 안전망)
    """
    html = _hwp_to_html(hwp_path)
    soup = BeautifulSoup(html, "lxml")

    tables = _find_top_level_tables(soup)
    if len(tables) < 2:
        raise RuntimeError(
            f"최상위 테이블 {len(tables)}개 발견 (최소 2개 필요). "
            f"양식이 예상과 다르거나 변환 결과가 비어있을 수 있습니다."
        )

    # rawJson: 전 테이블의 원본 셀 텍스트 (디버깅·재처리용)
    raw_data = {
        "hwp_file": os.path.basename(hwp_path),
        "table_count": len(tables),
        "tables": [
            [
                [_norm_label(c.get_text()) for c in _cells(r)]
                for r in _rows(tbl)
            ]
            for tbl in tables
        ],
    }

    teacher_name = _extract_teacher_name(tables[0])
    metadata, sections, montessori = _parse_main_table(tables[1])
    metadata["teacherName"] = teacher_name

    return {
        "metadata": metadata,
        "sections": sections,
        "montessoriRecords": montessori,
        "rawJson": json.dumps(raw_data, ensure_ascii=False),
    }
