"""Dependency-free text extraction from DOCX while preserving text structure."""

from __future__ import annotations

from pathlib import Path
from zipfile import BadZipFile, ZipFile
import xml.etree.ElementTree as ET


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _inline_text(element: ET.Element) -> str:
    parts: list[str] = []
    for node in element.iter():
        if node.tag in (W + "t", W + "delText"):
            parts.append(node.text or "")
        elif node.tag == W + "tab":
            parts.append("\t")
        elif node.tag in (W + "br", W + "cr"):
            parts.append("\n")
    return "".join(parts)


def _cell_text(cell: ET.Element) -> str:
    paragraphs = [_inline_text(p) for p in cell.findall(W + "p")]
    return "\n".join(paragraphs)


def extract_docx(path: str | Path) -> str:
    """Return paragraphs/tables in document order as structured plain text."""
    try:
        with ZipFile(path) as archive:
            root = ET.fromstring(archive.read("word/document.xml"))
    except (BadZipFile, KeyError, ET.ParseError) as exc:
        raise ValueError("该文件不是有效的 DOCX 文档") from exc

    body = root.find(W + "body")
    if body is None:
        return ""
    blocks: list[str] = []
    for child in body:
        if child.tag == W + "p":
            blocks.append(_inline_text(child))
        elif child.tag == W + "tbl":
            rows: list[str] = []
            for row in child.findall(W + "tr"):
                cells = [_cell_text(cell).strip("\n") for cell in row.findall(W + "tc")]
                rows.append("\t".join(cells))
            blocks.append("\n".join(rows))
    return "\n".join(blocks)
