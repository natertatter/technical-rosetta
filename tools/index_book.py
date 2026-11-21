#!/usr/bin/env python3
"""
Local Textbook Ingestion & Scoped Chapter Retrieval Tool
Indexes 'System Dynamics 3rd Edition - Palm III.pdf' page-by-page into a local
SQLite FTS5 database at ./index/palm_dynamics.db and provides a CLI search interface.
"""

import argparse
import os
import re
import sqlite3
import sys
from pathlib import Path

import pymupdf as fitz  # PyMuPDF


DEFAULT_PDF_PATH = "./textbooks/System Dynamics 3rd Edition - Palm III.pdf"
DEFAULT_DB_PATH = "./index/palm_dynamics.db"
BOOK_TITLE = "System Dynamics 3rd Edition - William J. Palm III"


def extract_headings(page_dict: dict, raw_text: str) -> str:
    """
    Detect headings on a page using font size heuristics and section/chapter regex patterns.
    """
    headings = []
    seen = set()

    # Check text blocks with larger font sizes or bold section markers
    blocks = page_dict.get("blocks", [])
    for b in blocks:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            line_text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
            if not line_text or len(line_text) > 120:
                continue
            max_size = max((span.get("size", 0) for span in line.get("spans", [])), default=0)
            is_chapter_or_sec = bool(
                re.match(
                    r"^(CHAPTER\s+\d+|Chapter\s+\d+|\d+\.\d+\s+[A-Z]|PART\s+[I|V|X]+|Example\s+\d+\.\d+\.\d+|Summary|Problems)",
                    line_text,
                )
            )
            if max_size >= 11.5 or is_chapter_or_sec:
                if is_chapter_or_sec or max_size >= 13.0:
                    clean = re.sub(r"\s+", " ", line_text)
                    if clean not in seen and len(clean) > 2:
                        seen.add(clean)
                        headings.append(clean)

    # Also fallback regex scan on lines
    for raw_line in raw_text.splitlines():
        s = raw_line.strip()
        if re.match(r"^(CHAPTER\s+\d+|(?:\d+\.\d+)\s+[A-Z][A-Za-z0-9\s\-–,]+)$", s) and len(s) < 100:
            if s not in seen:
                seen.add(s)
                headings.append(s)

    return " | ".join(headings[:8])


def init_db(db_path: str) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Standard metadata table + FTS5 virtual table
    cur.execute("DROP TABLE IF EXISTS pages_fts;")
    cur.execute("DROP TABLE IF EXISTS pages_meta;")

    cur.execute(
        """
        CREATE TABLE pages_meta (
            page_num INTEGER PRIMARY KEY,
            book_title TEXT NOT NULL,
            detected_headings TEXT,
            text_content TEXT
        );
        """
    )

    cur.execute(
        """
        CREATE VIRTUAL TABLE pages_fts USING fts5(
            book_title,
            page_num UNINDEXED,
            detected_headings,
            text_content,
            tokenize='porter unicode61'
        );
        """
    )
    conn.commit()
    return conn


def index_pdf(pdf_path: str, db_path: str) -> None:
    if not os.path.exists(pdf_path):
        print(f"Error: PDF not found at {pdf_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Indexing '{pdf_path}' into '{db_path}'...")
    doc = fitz.open(pdf_path)
    conn = init_db(db_path)
    cur = conn.cursor()

    rows_fts = []
    rows_meta = []

    for idx in range(len(doc)):
        page = doc[idx]
        page_num = idx + 1  # 1-indexed PDF page number
        raw_text = page.get_text("text") or ""
        page_dict = page.get_text("dict") or {}
        headings = extract_headings(page_dict, raw_text)

        rows_meta.append((page_num, BOOK_TITLE, headings, raw_text))
        rows_fts.append((BOOK_TITLE, str(page_num), headings, raw_text))

    cur.executemany(
        "INSERT INTO pages_meta (page_num, book_title, detected_headings, text_content) VALUES (?, ?, ?, ?);",
        rows_meta,
    )
    cur.executemany(
        "INSERT INTO pages_fts (book_title, page_num, detected_headings, text_content) VALUES (?, ?, ?, ?);",
        rows_fts,
    )
    conn.commit()
    total_pages = len(doc)
    conn.close()
    doc.close()
    print(f"Successfully indexed {total_pages} pages into {db_path}.")


def search_db(
    db_path: str,
    query: str,
    limit: int = 5,
    min_page: int | None = None,
    max_page: int | None = None,
    full_text: bool = False,
) -> None:
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}. Building index first...")
        index_pdf(DEFAULT_PDF_PATH, db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Build safe FTS5 query or fallback if special characters are used
    where_clauses = ["pages_fts MATCH ?"]
    params: list = [query]

    if min_page is not None:
        where_clauses.append("CAST(page_num AS INTEGER) >= ?")
        params.append(min_page)
    if max_page is not None:
        where_clauses.append("CAST(page_num AS INTEGER) <= ?")
        params.append(max_page)

    params.append(limit)
    where_sql = " AND ".join(where_clauses)

    sql = f"""
        SELECT
            book_title,
            CAST(page_num AS INTEGER) AS pnum,
            detected_headings,
            snippet(pages_fts, 3, '[', ']', ' ... ', 48) AS snip,
            text_content
        FROM pages_fts
        WHERE {where_sql}
        ORDER BY rank
        LIMIT ?;
    """

    try:
        cur.execute(sql, params)
        results = cur.fetchall()
    except sqlite3.OperationalError:
        # Sanitize query into OR / AND tokens if raw punctuation caused FTS syntax error
        tokens = re.findall(r"[A-Za-z0-9_]+", query)
        safe_q = " AND ".join(tokens) if tokens else query
        params[0] = safe_q
        cur.execute(sql, params)
        results = cur.fetchall()

    conn.close()

    if not results:
        print(f"No matches found for query: {query}")
        return

    print(f"=== Found {len(results)} result(s) for '{query}' ===")
    for i, (title, pnum, headings, snip, content) in enumerate(results, 1):
        print(f"\n[{i}] {title} | PDF Page {pnum}")
        if headings:
            print(f"    Headings: {headings}")
        if full_text:
            print("    --- Content ---")
            print(content.strip())
        else:
            clean_snip = re.sub(r"\s+", " ", snip).strip()
            print(f"    Snippet: {clean_snip}")


def show_page(db_path: str, page_num: int) -> None:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT book_title, page_num, detected_headings, text_content FROM pages_meta WHERE page_num = ?;",
        (page_num,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        print(f"Page {page_num} not found.")
        return
    title, pnum, headings, content = row
    print(f"=== {title} | PDF Page {pnum} ===")
    print(f"Headings: {headings}")
    print("-" * 60)
    print(content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Index and search Palm III System Dynamics PDF via SQLite FTS5.")
    parser.add_argument("--pdf", default=DEFAULT_PDF_PATH, help="Path to PDF file")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="Path to SQLite FTS5 database")
    parser.add_argument("--index", action="store_true", help="Force re-indexing the PDF")
    parser.add_argument("--search", type=str, help="FTS5 search query")
    parser.add_argument("--limit", type=int, default=5, help="Max search results to return")
    parser.add_argument("--min-page", type=int, default=None, help="Minimum PDF page number filter")
    parser.add_argument("--max-page", type=int, default=None, help="Maximum PDF page number filter")
    parser.add_argument("--full", action="store_true", help="Print full page text for search results")
    parser.add_argument("--page", type=int, default=None, help="Display a specific PDF page number")

    args = parser.parse_args()

    if args.index or not os.path.exists(args.db):
        if not args.search and args.page is None:
            index_pdf(args.pdf, args.db)
            return
        elif not os.path.exists(args.db):
            index_pdf(args.pdf, args.db)

    if args.page is not None:
        show_page(args.db, args.page)
    elif args.search:
        search_db(
            args.db,
            args.search,
            limit=args.limit,
            min_page=args.min_page,
            max_page=args.max_page,
            full_text=args.full,
        )
    else:
        index_pdf(args.pdf, args.db)


if __name__ == "__main__":
    main()
