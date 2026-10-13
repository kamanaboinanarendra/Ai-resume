import io
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas
from app.services.template_registry import get_template_by_id

class NumberedCanvas(canvas.Canvas):
    """Canvas that adds page numbers dynamically."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count: int):
        if page_count > 1:
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#6B7280"))
            self.drawRightString(
                letter[0] - 36,
                20,
                f"Page {self._pageNumber} of {page_count}"
            )

def hex_to_color(hex_str: str, default: colors.Color) -> colors.Color:
    try:
        if hex_str and hex_str.startswith("#"):
            return colors.HexColor(hex_str)
    except Exception:
        pass
    return default

def generate_resume_pdf(resume_data: Dict[str, Any], template_id: str = "classic-professional") -> io.BytesIO:
    """
    Generates a professional PDF matching the selected template and real candidate data.
    """
    buffer = io.BytesIO()
    template_info = get_template_by_id(template_id)
    layout_family = template_info.layout_family if template_info else "classic-single"

    customization = resume_data.get("customization", {})
    primary_color_hex = customization.get("primary_color") or (template_info.thumbnail_accent if template_info else "#D62828")
    primary_color = hex_to_color(primary_color_hex, colors.HexColor("#D62828"))
    dark_text_color = colors.HexColor("#222222")
    secondary_text_color = colors.HexColor("#4B5563")

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Base typography styles
    title_style = ParagraphStyle(
        'ResumeTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color if layout_family != "bold-header" else colors.white,
        alignment=0 # Left
    )

    subtitle_style = ParagraphStyle(
        'ResumeSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=secondary_text_color if layout_family != "bold-header" else colors.HexColor("#F3F4F6"),
        alignment=0
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceAfter=4,
        spaceBefore=8,
        keepWithNext=True
    )

    item_title_style = ParagraphStyle(
        'ItemTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=dark_text_color
    )

    item_subtitle_style = ParagraphStyle(
        'ItemSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=secondary_text_color
    )

    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_text_color
    )

    meta_style = ParagraphStyle(
        'ResumeMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=secondary_text_color
    )

    story = []

    # 1. Header Section
    p_info = resume_data.get("personal_info", {})
    full_name = p_info.get("full_name") or "Your Name"
    prof_title = p_info.get("professional_title") or ""

    contact_parts = []
    if p_info.get("email"):
        contact_parts.append(p_info["email"])
    if p_info.get("phone"):
        contact_parts.append(p_info["phone"])
    if p_info.get("city_country"):
        contact_parts.append(p_info["city_country"])
    if p_info.get("linkedin_url"):
        contact_parts.append(p_info["linkedin_url"])
    if p_info.get("github_url"):
        contact_parts.append(p_info["github_url"])
    if p_info.get("portfolio_url"):
        contact_parts.append(p_info["portfolio_url"])

    contact_line = " • ".join(contact_parts)

    if layout_family == "bold-header":
        # Bold banner header table with solid background
        header_table = Table(
            [
                [Paragraph(f"<b>{full_name}</b>", title_style)],
                [Paragraph(prof_title, subtitle_style)] if prof_title else [Spacer(1, 0)],
                [Paragraph(contact_line, ParagraphStyle('BannerContact', parent=meta_style, textColor=colors.HexColor("#F3F4F6")))]
            ],
            colWidths=[letter[0] - 72]
        )
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), primary_color),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 16),
            ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 12))
    else:
        # Standard elegant header
        story.append(Paragraph(f"<b>{full_name}</b>", title_style))
        if prof_title:
            story.append(Spacer(1, 2))
            story.append(Paragraph(prof_title, subtitle_style))
        if contact_line:
            story.append(Spacer(1, 4))
            story.append(Paragraph(contact_line, meta_style))
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=8))

    def add_section_header(title: str):
        story.append(Paragraph(title.upper(), section_heading_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB"), spaceBefore=1, spaceAfter=6))

    # 2. Professional Summary
    summary = resume_data.get("professional_summary", "").strip()
    if summary:
        add_section_header("Professional Summary")
        story.append(Paragraph(summary, body_style))
        story.append(Spacer(1, 8))

    # 3. Experience & Internships
    experiences = resume_data.get("experience", [])
    if experiences:
        add_section_header("Experience & Work History")
        for exp in experiences:
            job_title = exp.get("job_title", "").strip()
            company = exp.get("company", "").strip()
            dates = f"{exp.get('start_date', '')} - {'Present' if exp.get('currently_working') else exp.get('end_date', '')}".strip(" -")
            loc = exp.get("location", "").strip()
            
            row_data = [
                Paragraph(f"<b>{job_title}</b>", item_title_style),
                Paragraph(f"<font color='#6B7280'>{dates}</font>", ParagraphStyle('RightDate', parent=meta_style, alignment=2))
            ]
            t = Table([row_data], colWidths=[letter[0] - 72 - 140, 140])
            t.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))
            story.append(t)
            
            sub_text = f"{company}{' • ' + loc if loc else ''}"
            if sub_text:
                story.append(Paragraph(sub_text, item_subtitle_style))
            
            resp = exp.get("responsibilities", "").strip()
            if resp:
                story.append(Spacer(1, 2))
                for line in resp.split("\n"):
                    line = line.strip().lstrip("•-* ")
                    if line:
                        story.append(Paragraph(f"• {line}", body_style))
                        
            achieve = exp.get("achievements", "").strip()
            if achieve:
                story.append(Spacer(1, 1))
                for line in achieve.split("\n"):
                    line = line.strip().lstrip("•-* ")
                    if line:
                        story.append(Paragraph(f"<b>Key Achievement:</b> {line}", body_style))

            story.append(Spacer(1, 6))

    # 4. Projects
    projects = resume_data.get("projects", [])
    if projects:
        add_section_header("Projects")
        for proj in projects:
            name = proj.get("name", "").strip()
            tech = proj.get("technologies", "").strip()
            desc = proj.get("description", "").strip()
            links = []
            if proj.get("github_url"):
                links.append(f"GitHub: {proj['github_url']}")
            if proj.get("live_url"):
                links.append(f"Live: {proj['live_url']}")
            
            header_str = f"<b>{name}</b>"
            if tech:
                header_str += f" <font color='#6B7280'>| {tech}</font>"
            story.append(Paragraph(header_str, item_title_style))
            
            if links:
                story.append(Paragraph(" • ".join(links), meta_style))
            
            if desc:
                story.append(Spacer(1, 2))
                for line in desc.split("\n"):
                    line = line.strip().lstrip("•-* ")
                    if line:
                        story.append(Paragraph(f"• {line}", body_style))
            story.append(Spacer(1, 6))

    # 5. Education
    education = resume_data.get("education", [])
    if education:
        add_section_header("Education")
        for edu in education:
            deg = edu.get("degree", "").strip()
            inst = edu.get("institution", "").strip()
            dates = f"{edu.get('start_date', '')} - {edu.get('end_date', '')}".strip(" -")
            gpa = edu.get("gpa", "").strip()
            coursework = edu.get("coursework", "").strip()

            row_data = [
                Paragraph(f"<b>{deg}</b>", item_title_style),
                Paragraph(f"<font color='#6B7280'>{dates}</font>", ParagraphStyle('RightDate', parent=meta_style, alignment=2))
            ]
            t = Table([row_data], colWidths=[letter[0] - 72 - 140, 140])
            t.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))
            story.append(t)
            
            inst_text = f"{inst}{' • GPA/Grade: ' + gpa if gpa else ''}"
            story.append(Paragraph(inst_text, item_subtitle_style))
            if coursework:
                story.append(Paragraph(f"<b>Relevant Coursework:</b> {coursework}", body_style))
            story.append(Spacer(1, 5))

    # 6. Technical Skills
    skills_cats = resume_data.get("skills", [])
    if skills_cats:
        add_section_header("Skills & Competencies")
        for cat in skills_cats:
            cat_name = cat.get("category_name", "").strip()
            s_list = ", ".join(cat.get("skills", []))
            if s_list:
                story.append(Paragraph(f"<b>{cat_name}:</b> {s_list}", body_style))
                story.append(Spacer(1, 2))
        story.append(Spacer(1, 4))

    # 7. Certifications
    certs = resume_data.get("certifications", [])
    if certs:
        add_section_header("Certifications")
        for c in certs:
            name = c.get("name", "").strip()
            issuer = c.get("issuer", "").strip()
            date = c.get("issue_date", "").strip()
            c_str = f"<b>{name}</b> — {issuer} ({date})" if date else f"<b>{name}</b> — {issuer}"
            story.append(Paragraph(c_str, body_style))
            if c.get("credential_url"):
                story.append(Paragraph(f"Credential: {c['credential_url']}", meta_style))
            story.append(Spacer(1, 3))

    # 8. Additional Sections
    additionals = resume_data.get("additional_sections", [])
    if additionals:
        for sec in additionals:
            title = sec.get("title", "Additional Information").strip()
            content = sec.get("content", "").strip()
            if content:
                add_section_header(title)
                for line in content.split("\n"):
                    line = line.strip().lstrip("•-* ")
                    if line:
                        story.append(Paragraph(f"• {line}", body_style))
                story.append(Spacer(1, 4))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer

def generate_ats_report_pdf(ats_data: Dict[str, Any]) -> io.BytesIO:
    """
    Generates a professional PDF audit report for an ATS score analysis.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    story = []

    primary_color = colors.HexColor("#D62828")
    dark_text = colors.HexColor("#222222")
    gray_text = colors.HexColor("#4B5563")

    report_title_style = ParagraphStyle(
        'ATSReportTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=dark_text
    )

    h2_style = ParagraphStyle(
        'ATSH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'ATSBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_text
    )

    # 1. Header Banner
    story.append(Paragraph("<b>AI Resume Builder</b> &bull; ATS Compatibility Report", report_title_style))
    story.append(Paragraph("Automated Rubric Audit & Actionable Optimization Plan", ParagraphStyle('Sub', fontName='Helvetica', fontSize=10, textColor=gray_text, leading=14)))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=12))

    # 2. Main Score Summary Table
    general_score = ats_data.get("general_score", 0)
    grade = ats_data.get("grade", "N/A")
    verdict = ats_data.get("verdict", "")

    jd_match = ats_data.get("job_description_match")
    jd_score_text = f"{jd_match['match_score']}/100" if jd_match and jd_match.get("has_job_description") else "N/A (No JD provided)"

    score_data = [
        [
            Paragraph(f"<b>General ATS Compatibility:</b><br/><font size='16' color='#D62828'><b>{general_score}/100</b></font><br/><b>Grade:</b> {grade}", body_style),
            Paragraph(f"<b>Job Description Alignment:</b><br/><font size='16' color='#1E293B'><b>{jd_score_text}</b></font><br/>Role Target: {jd_match.get('target_role', 'General') if jd_match else 'General'}", body_style)
        ]
    ]

    score_table = Table(score_data, colWidths=[270, 270])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFF7F7")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ('INNERGRID', (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 6))

    if verdict:
        story.append(Paragraph(f"<b>Verdict:</b> {verdict}", body_style))
        story.append(Spacer(1, 10))

    # 3. Category Breakdown Table
    story.append(Paragraph("Category Breakdown (100 Points Total Rubric)", h2_style))
    categories = ats_data.get("categories", {})

    cat_rows = [
        [
            Paragraph("<b>Category</b>", body_style),
            Paragraph("<b>Score</b>", body_style),
            Paragraph("<b>Status / Key Finding</b>", body_style)
        ]
    ]

    for cat_key, cat_val in categories.items():
        score = cat_val.get("score", 0)
        max_score = cat_val.get("max", 0)
        label = cat_val.get("label", cat_key)
        strengths = cat_val.get("strengths", [])
        issues = cat_val.get("issues", [])
        note = strengths[0] if strengths else (issues[0] if issues else "Evaluated")
        cat_rows.append([
            Paragraph(f"<b>{label}</b>", body_style),
            Paragraph(f"<b>{score}</b> / {max_score}", body_style),
            Paragraph(note[:80] + "..." if len(note) > 80 else note, body_style)
        ])

    cat_table = Table(cat_rows, colWidths=[180, 80, 280])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(cat_table)
    story.append(Spacer(1, 12))

    # 4. Job Description Match Breakdown (if available)
    if jd_match and jd_match.get("has_job_description"):
        story.append(Paragraph("Job Description Keyword Alignment", h2_style))
        matched = jd_match.get("matched_skills", [])
        missing = jd_match.get("missing_skills", [])
        if matched:
            story.append(Paragraph(f"<b>Matched Requirements ({len(matched)}):</b> {', '.join(matched[:15])}", body_style))
            story.append(Spacer(1, 3))
        if missing:
            story.append(Paragraph(f"<b>Missing Requirements ({len(missing)}):</b> {', '.join(missing[:15])}", body_style))
            story.append(Spacer(1, 6))

    # 5. Prioritized Mistakes & Action Items
    mistakes = ats_data.get("mistakes", [])
    if mistakes:
        story.append(Paragraph(f"Identified Recommendations ({len(mistakes)} Total)", h2_style))
        for idx, m in enumerate(mistakes[:8], 1):
            severity = m.get("severity", "warning").upper()
            title = m.get("title", "Optimization Point")
            prob = m.get("problem", "")
            rec = m.get("recommendation", "")
            ded = m.get("points_deducted", 0)

            story.append(Paragraph(f"<b>{idx}. [{severity}] {title}</b> (-{ded} pts)", body_style))
            if prob:
                story.append(Paragraph(f"&bull; <i>Problem:</i> {prob}", ParagraphStyle('P2', parent=body_style, leftIndent=12, textColor=gray_text)))
            if rec:
                story.append(Paragraph(f"&bull; <i>Recommendation:</i> {rec}", ParagraphStyle('P3', parent=body_style, leftIndent=12, textColor=dark_text)))
            story.append(Spacer(1, 4))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer

