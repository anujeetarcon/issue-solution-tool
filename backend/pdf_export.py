from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    KeepTogether, PageBreak, Table, TableStyle, Image
)
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from datetime import datetime
import io, os, urllib.request

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm

ARCON_RED   = colors.HexColor("#D0202A")
ARCON_DARK  = colors.HexColor("#1a1a1a")
GRAY_MID    = colors.HexColor("#5F5E5A")
GRAY_MUTED  = colors.HexColor("#888780")
GRAY_LIGHT  = colors.HexColor("#D3D1C7")
WHITE       = colors.white

ORG_NAME    = "ARCON TECHSOLUTIONS"
TAGLINE     = "Predict | Protect | Prevent"
WEBSITE     = "www.arconnet.com"
DOC_TYPE    = "Issue & Solution Report"


# ── Cover page ────────────────────────────────────────────────────────────────

def draw_cover(c, doc, issue_count, generated):
    w, h = A4

    c.setFillColor(ARCON_RED)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica", 9)
    c.drawRightString(w - MARGIN, h - 1.6 * cm, TAGLINE)

    title_y = h * 0.42
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(WHITE)
    c.drawRightString(w - MARGIN, title_y + 2.8 * cm, ORG_NAME)

    c.setFont("Helvetica-Bold", 18)
    c.drawRightString(w - MARGIN, title_y + 1.6 * cm, DOC_TYPE)

    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#F8D0D2"))
    c.drawRightString(w - MARGIN, title_y + 0.6 * cm,
                      "Knowledge Base Export  —  Internal Use Only")

    c.setFillColor(colors.HexColor("#A8181F"))
    c.rect(0, 0, w, 2.2 * cm, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 0.8 * cm, f"{WEBSITE}  |  Copyright © {datetime.now().year}")

    _draw_arcon_logo(c, w - MARGIN - 3.2 * cm, 0.4 * cm, size=1.2 * cm)
    c.showPage()


def _draw_arcon_logo(c, x, y, size=1 * cm):
    c.setStrokeColor(WHITE)
    c.setFillColor(WHITE)
    c.setLineWidth(1.5)
    h = size * 0.866
    path = c.beginPath()
    path.moveTo(x + size / 2, y + h)
    path.lineTo(x + size, y)
    path.lineTo(x, y)
    path.close()
    c.drawPath(path, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", size * 0.8)
    c.drawString(x + size + 6, y + h * 0.3, "arcon")


# ── Header / Footer ───────────────────────────────────────────────────────────

def draw_header_footer(c, doc, issue_count, generated):
    w, h = A4
    page = doc.page

    c.setStrokeColor(GRAY_LIGHT)
    c.setLineWidth(0.5)
    c.line(MARGIN, h - 1.8 * cm, w - MARGIN, h - 1.8 * cm)
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY_MID)
    c.drawString(MARGIN, h - 1.5 * cm, DOC_TYPE)
    c.drawRightString(w - MARGIN, h - 1.5 * cm, TAGLINE)

    c.setStrokeColor(GRAY_LIGHT)
    c.line(MARGIN, 1.6 * cm, w - MARGIN, 1.6 * cm)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRAY_MUTED)
    c.drawString(MARGIN, 1.1 * cm,
                 f"{ORG_NAME}  —  Confidential & Internal Use Only")
    c.drawRightString(w - MARGIN, 1.1 * cm, f"Page {page}")


# ── Styles ────────────────────────────────────────────────────────────────────

def make_styles():
    base = getSampleStyleSheet()

    def ps(name, **kw):
        return ParagraphStyle(name, parent=base["Normal"], **kw)

    return {
        "report_title": ps("report_title",
            fontName="Helvetica-Bold", fontSize=18,
            textColor=ARCON_DARK, leading=24,
            alignment=TA_CENTER, spaceAfter=4),

        "report_sub": ps("report_sub",
            fontName="Helvetica", fontSize=10,
            textColor=GRAY_MID, leading=14,
            alignment=TA_CENTER, spaceAfter=20),

        # CHANGE 2: issue_number now right-aligned at small size
        "issue_number": ps("issue_number",
            fontName="Helvetica-Bold", fontSize=10,
            textColor=ARCON_RED, leading=18,
            alignment=TA_RIGHT),

        "issue_title": ps("issue_title",
            fontName="Helvetica-Bold", fontSize=14,
            textColor=ARCON_DARK, leading=18),

        "tags": ps("tags",
            fontName="Helvetica", fontSize=9,
            textColor=GRAY_MUTED, leading=13, spaceAfter=10),

        "section_label": ps("section_label",
            fontName="Helvetica-Bold", fontSize=9,
            textColor=ARCON_RED, leading=12,
            spaceBefore=10, spaceAfter=4),

        "body": ps("body",
            fontName="Helvetica", fontSize=10,
            textColor=ARCON_DARK, leading=15, spaceAfter=4),

        "step_body": ps("step_body",
            fontName="Helvetica", fontSize=10,
            textColor=ARCON_DARK, leading=15),

        "img_caption": ps("img_caption",
            fontName="Helvetica", fontSize=8,
            textColor=GRAY_MUTED, leading=11,
            alignment=TA_CENTER, spaceAfter=8),
    }


# ── Image helper ──────────────────────────────────────────────────────────────

def load_image(image_path: str, max_width=14*cm, max_height=8*cm):
    """
    Resolve image_path to an absolute local file and return a scaled
    ReportLab Image, or None if the file cannot be found/loaded.

    image_path is stored in the DB as  /uploads/<uuid>.<ext>
    The uploads/ folder sits inside the backend/ directory next to this file.
    """
    if not image_path:
        return None

    try:
        # ── 1. Already an absolute path that exists ───────────────────────────
        if os.path.isabs(image_path) and os.path.exists(image_path):
            resolved = image_path

        # ── 2. /uploads/xxx.png  →  <backend_dir>/uploads/xxx.png ───────────
        elif image_path.startswith("/uploads/"):
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            resolved = os.path.join(backend_dir, image_path.lstrip("/"))

        # ── 3. Relative path  →  resolve from backend dir ────────────────────
        elif not image_path.startswith("http"):
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            resolved = os.path.join(backend_dir, image_path)

        # ── 4. Full http/https URL ────────────────────────────────────────────
        else:
            data = urllib.request.urlopen(image_path, timeout=5).read()
            img = Image(io.BytesIO(data))
            iw, ih = img.imageWidth, img.imageHeight
            ratio = min(max_width / iw, max_height / ih, 1.0)
            img.drawWidth  = iw * ratio
            img.drawHeight = ih * ratio
            return img

        if not os.path.exists(resolved):
            return None

        img = Image(resolved)
        iw, ih = img.imageWidth, img.imageHeight
        ratio = min(max_width / iw, max_height / ih, 1.0)
        img.drawWidth  = iw * ratio
        img.drawHeight = ih * ratio
        return img

    except Exception:
        return None


# ── Main generate ─────────────────────────────────────────────────────────────

def generate_pdf(issues) -> bytes:
    buffer = io.BytesIO()
    generated = datetime.now().strftime("%d %B %Y, %H:%M")
    issue_count = len(issues)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=2.6 * cm,
        bottomMargin=2.4 * cm,
    )

    styles = make_styles()
    story = []

    # Cover drawn via canvas callback — single PageBreak placeholder
    story.append(PageBreak())

    # Report heading
    story.append(Paragraph(DOC_TYPE, styles["report_title"]))
    story.append(Paragraph(
        "Exported from the Issue &amp; Solution Knowledge Base"
        "&nbsp;&nbsp;—&nbsp;&nbsp;for internal use only",
        styles["report_sub"]
    ))
    story.append(HRFlowable(width="100%", thickness=1,
                             color=ARCON_RED, spaceAfter=20))

    for idx, issue in enumerate(issues):
        elems = []

        # CHANGE 2: Title left — Issue number right — same line
        title_para = Paragraph(issue.title, styles["issue_title"])
        num_para   = Paragraph(f"Issue {str(idx + 1).zfill(2)}", styles["issue_number"])
        header_tbl = Table([[title_para, num_para]], colWidths=["82%", "18%"])
        header_tbl.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elems.append(header_tbl)

        # Tags
        tags = [t.name for t in issue.tags]
        if tags:
            elems.append(Paragraph(
                "  ·  ".join(f"#{t}" for t in tags), styles["tags"]))

        elems.append(HRFlowable(width="100%", thickness=0.5,
                                  color=GRAY_LIGHT, spaceAfter=8))

        # CHANGE 3: Attached image
        if getattr(issue, "image_path", None):
            img = load_image(issue.image_path)
            if img:
                elems.append(Paragraph("SCREENSHOT", styles["section_label"]))
                elems.append(img)
                elems.append(Paragraph("Attached screenshot", styles["img_caption"]))

        elems.append(Paragraph("SYMPTOMS", styles["section_label"]))
        elems.append(Paragraph(issue.symptoms, styles["body"]))

        elems.append(Paragraph("ROOT CAUSE", styles["section_label"]))
        elems.append(Paragraph(issue.cause or "Not specified", styles["body"]))

        sorted_steps = sorted(issue.solutions, key=lambda s: s.step_number)
        if sorted_steps:
            elems.append(Paragraph("RESOLUTION STEPS", styles["section_label"]))
            elems.append(Spacer(1, 4))
            for step in sorted_steps:
                elems.append(Paragraph(
                    f"<b>{step.step_number}.</b> &nbsp; {step.description}",
                    styles["step_body"]
                ))
                elems.append(Spacer(1, 5))

        story.append(KeepTogether(elems))

        if idx < len(issues) - 1:
            story.append(Spacer(1, 16))
            story.append(HRFlowable(width="100%", thickness=1.5,
                                     color=ARCON_RED,
                                     spaceBefore=4, spaceAfter=20))

    # Final confidentiality page
    story.append(PageBreak())
    story.append(Spacer(1, 10 * cm))
    story.append(Paragraph(
        "<b>CONFIDENTIAL:</b> No part of this publication may be reproduced, "
        "stored in a retrieval system, or transmitted in any form or by any means "
        "such as electronic, mechanical, photocopying, recording, or otherwise "
        "without permission.",
        ParagraphStyle("conf", fontName="Helvetica", fontSize=9,
                       textColor=GRAY_MID, leading=14, alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("Privileged Access Management Suite",
        ParagraphStyle("pams", fontName="Helvetica", fontSize=10,
                       textColor=GRAY_MID, leading=14, alignment=TA_CENTER)))
    story.append(Paragraph("<b>arcon</b>",
        ParagraphStyle("arcontext", fontName="Helvetica-Bold", fontSize=22,
                       textColor=ARCON_DARK, leading=28, alignment=TA_CENTER)))
    story.append(Paragraph("Predict  |  Protect  |  Prevent",
        ParagraphStyle("tagline_end", fontName="Helvetica", fontSize=11,
                       textColor=GRAY_MID, leading=16, alignment=TA_CENTER)))

    def on_first_page(c, doc):
        draw_cover(c, doc, issue_count, generated)

    def on_later_pages(c, doc):
        draw_header_footer(c, doc, issue_count, generated)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    buffer.seek(0)
    return buffer.read()
