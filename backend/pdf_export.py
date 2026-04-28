from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT
import io


SEVERITY_COLORS = {
    "high": colors.HexColor("#A32D2D"),
    "medium": colors.HexColor("#854F0B"),
    "low": colors.HexColor("#3B6D11"),
}


def generate_pdf(issues) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=20, textColor=colors.HexColor("#1a1a1a"),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#888780"),
        spaceAfter=20
    )
    issue_title_style = ParagraphStyle(
        "IssueTitle", parent=styles["Heading2"],
        fontSize=14, textColor=colors.HexColor("#1a1a1a"),
        spaceBefore=16, spaceAfter=6
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#5F5E5A"),
        spaceBefore=10, spaceAfter=4,
        fontName="Helvetica-Bold"
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#2C2C2A"),
        leading=16
    )
    step_style = ParagraphStyle(
        "Step", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#2C2C2A"),
        leading=16, leftIndent=10
    )

    story = []

    story.append(Paragraph("Issue & Solution Report", title_style))
    story.append(Paragraph(f"Total issues: {len(issues)}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D3D1C7")))
    story.append(Spacer(1, 12))

    for i, issue in enumerate(issues):
        severity_color = SEVERITY_COLORS.get(issue.severity, colors.gray)

        badge_data = [[
            Paragraph(f"  {issue.severity.upper()}  ", ParagraphStyle(
                "badge", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold"
            )),
            Paragraph(f"  {issue.category}  ", ParagraphStyle(
                "cat", fontSize=8, textColor=colors.HexColor("#5F5E5A")
            ))
        ]]
        badge_table = Table(badge_data, colWidths=[2.5 * cm, 3.5 * cm])
        badge_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), severity_color),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F1EFE8")),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))

        story.append(badge_table)
        story.append(Paragraph(issue.title, issue_title_style))

        tags = [t.name for t in issue.tags]
        if tags:
            story.append(Paragraph("Tags: " + " · ".join(f"#{t}" for t in tags), ParagraphStyle(
                "tags", fontSize=9, textColor=colors.HexColor("#888780"), spaceAfter=8
            )))

        story.append(Paragraph("SYMPTOMS", label_style))
        story.append(Paragraph(issue.symptoms, body_style))

        story.append(Paragraph("ROOT CAUSE", label_style))
        story.append(Paragraph(issue.cause, body_style))

        sorted_solutions = sorted(issue.solutions, key=lambda s: s.step_number)
        if sorted_solutions:
            story.append(Paragraph("RESOLUTION STEPS", label_style))
            for step in sorted_solutions:
                story.append(Paragraph(f"{step.step_number}. {step.description}", step_style))
                story.append(Spacer(1, 4))

        if i < len(issues) - 1:
            story.append(Spacer(1, 12))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D3D1C7")))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
