import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_veltron_deck(output_path="Veltron_Auto_Pitch_Deck.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Colors
    C_BG = RGBColor(5, 5, 5)
    C_CARD = RGBColor(20, 20, 20)
    C_RED = RGBColor(255, 0, 0)
    C_WHITE = RGBColor(255, 255, 255)
    C_GRAY = RGBColor(153, 153, 153)
    C_DARK_GRAY = RGBColor(34, 34, 34)

    def set_bg(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = C_BG

    def add_header(slide, tag_text, title_text):
        # Category Tag
        txBox = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf = txBox.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = tag_text.upper()
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = C_RED
        p.font.name = "Segoe UI"
        
        # Main Title
        txBox2 = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf2 = txBox2.text_frame
        tf2.word_wrap = True
        p2 = tf2.paragraphs[0]
        p2.text = title_text
        p2.font.size = Pt(24)
        p2.font.bold = True
        p2.font.color.rgb = C_WHITE
        p2.font.name = "Segoe UI"

    # SLIDE 1: Title Slide
    s1 = prs.slides.add_slide(blank_layout)
    set_bg(s1)
    
    # Red accent line
    shape = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.2), Inches(0.6), Inches(0.06))
    shape.fill.solid()
    shape.fill.fore_color.rgb = C_RED
    shape.line.fill.background()

    tb = s1.shapes.add_textbox(Inches(0.8), Inches(2.5), Inches(11.5), Inches(2.0))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "VELTRON AUTO"
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.font.name = "Segoe UI"
    
    p2 = tf.add_paragraph()
    p2.text = "ENGINEERING EMOTION. DEFINING MOTION."
    p2.font.size = Pt(18)
    p2.font.color.rgb = C_RED
    p2.font.name = "Segoe UI"
    p2.space_before = Pt(10)

    p3 = tf.add_paragraph()
    p3.text = "Investor & Partner Pitch Deck | Independent Automotive R&D Studio"
    p3.font.size = Pt(14)
    p3.font.color.rgb = C_GRAY
    p3.font.name = "Segoe UI"
    p3.space_before = Pt(15)

    # Footer note on cover
    tb_foot = s1.shapes.add_textbox(Inches(0.8), Inches(6.2), Inches(11.5), Inches(0.5))
    p_foot = tb_foot.text_frame.paragraphs[0]
    p_foot.text = "Founder & Automotive Design Director: Boris Vlajnić  |  Belgrade, Serbia  |  office@veltroncars.com"
    p_foot.font.size = Pt(11)
    p_foot.font.color.rgb = C_GRAY

    # SLIDE 2: Problem
    s2 = prs.slides.add_slide(blank_layout)
    set_bg(s2)
    add_header(s2, "01 / The Industry Challenge", "The Loss of Connection in Modern Automotive Engineering")

    probs = [
        ("Tech Overload Without Emotion", "Vehicles are becoming heavier, overly digitalized, and disconnected. Massive screens and over-engineered infotainment remove the visceral joy of driving."),
        ("Generic EV Design Language", "Automotive design is shifting toward sterile, interchangeable shapes. Veltron rejects the notion that the future must be generic or characterless."),
        ("The Core Engineering Challenge", "How do we fuse advanced aerodynamics, powertrain intelligence, and digital Cockpits with a vehicle that retains true soul and driver connection?")
    ]
    for i, (title, desc) in enumerate(probs):
        left = Inches(0.8 + i * 3.9)
        top = Inches(2.0)
        card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(3.6), Inches(4.5))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY
        
        tb = s2.shapes.add_textbox(left + Inches(0.2), top + Inches(0.3), Inches(3.2), Inches(3.9))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = f"0{i+1}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = C_RED
        
        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(16)
        p2.font.bold = True
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(10)
        
        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(12)
        p3.font.color.rgb = C_GRAY
        p3.space_before = Pt(12)

    # SLIDE 3: Solution & Core Pillars
    s3 = prs.slides.add_slide(blank_layout)
    set_bg(s3)
    add_header(s3, "02 / The Veltron Solution", "The Four Pillars of Veltron Automotive Philosophy")

    pillars = [
        ("EMOTIONAL AERODYNAMICS", "Form follows motion. Sculpting exterior surfaces where aerodynamic efficiency enhances aesthetic power."),
        ("INTELLIGENT ENGINEERING", "Performance without excess. High-precision structural and powertrain architecture tailored for purpose."),
        ("HUMAN-MACHINE INTELLIGENCE", "Technology should disappear into the experience. Cockpit software that serves the driver, not distracts."),
        ("ACCESSIBLE PERFORMANCE", "Democratizing high-performance engineering. Advanced vehicle dynamics engineered for engagement.")
    ]
    for i, (title, desc) in enumerate(pillars):
        row = i // 2
        col = i % 2
        left = Inches(0.8 + col * 5.9)
        top = Inches(2.0 + row * 2.5)
        
        card = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(5.6), Inches(2.2))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY

        tb = s3.shapes.add_textbox(left + Inches(0.3), top + Inches(0.25), Inches(5.0), Inches(1.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = C_RED
        
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(8)

    # SLIDE 4: Veltron V1 SportLine
    s4 = prs.slides.add_slide(blank_layout)
    set_bg(s4)
    add_header(s4, "03 / Flagship Demonstrator", "Veltron V1 SportLine — Premium Boutique Performance Sedan")

    tb = s4.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(11.7), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True

    features = [
        ("Concept Positioning", "Boutique sports sedan designed as the primary demonstrator of Veltron's design language."),
        ("Design Highlights", "Athletic sedan proportions, sculpted air ducts, minimalist premium cabin, driver-focused layout."),
        ("Cockpit Integration", "Natively designed around the SkyUI 21:9 digital ecosystem for effortless control."),
        ("R&D Philosophy", "A vehicle that balances daily usability, high-speed stability, and distinctive brand presence.")
    ]

    for title, desc in features:
        p = tf.add_paragraph()
        p.text = f"•  {title}: "
        p.font.bold = True
        p.font.size = Pt(14)
        p.font.color.rgb = C_WHITE
        p.space_before = Pt(14)
        
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_GRAY

    # SLIDE 5: V-Force Propulsion
    s5 = prs.slides.add_slide(blank_layout)
    set_bg(s5)
    add_header(s5, "04 / Powertrain Architecture", "V-Force Propulsion System Concept")

    card = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.0), Inches(11.7), Inches(4.8))
    card.fill.solid()
    card.fill.fore_color.rgb = C_CARD
    card.line.color.rgb = C_DARK_GRAY

    tb = s5.shapes.add_textbox(Inches(1.2), Inches(2.3), Inches(10.9), Inches(4.2))
    tf = tb.text_frame
    tf.word_wrap = True

    vf_points = [
        ("Multi-Powertrain Agnosticism", "V-Force is an R&D propulsion framework not tied to a single fuel source. It supports ICE, Hybrid, and EV setups."),
        ("Intelligent Power Delivery", "Engineered for linear torque application, thermal efficiency, and compact packaging."),
        ("Driver Engagement First", "Ensures dynamic throttle response and mechanical sound signature regardless of powertrain layout."),
        ("Future Commercial Licensing", "Designed to serve both Veltron vehicles and potential third-party boutique automotive partners.")
    ]

    for title, desc in vf_points:
        p = tf.add_paragraph()
        p.text = title.upper()
        p.font.bold = True
        p.font.size = Pt(14)
        p.font.color.rgb = C_RED
        p.space_before = Pt(12)

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(4)

    # SLIDE 6: SkyUI Cockpit
    s6 = prs.slides.add_slide(blank_layout)
    set_bg(s6)
    add_header(s6, "05 / Digital Cockpit & HMI", "SkyUI — Modular Human-Machine Interface")

    modules = [
        ("21:9 Ultrawide Layout", "2560×960 target OLED interface tailored specifically for driver field of view."),
        ("Integrated Systems", "Dual-zone climate (0.5° steps), 24-band EQ audio, navigation HUD, phone & media."),
        ("Driver-Centric UI", "Physical-control friendly, non-distracting animated transitions, digital vehicle cards."),
        ("Future Architecture", "Planned CAN, OBD, LIN integration, Veltron AI voice assistant, and OTA cloud services.")
    ]

    for i, (title, desc) in enumerate(modules):
        left = Inches(0.8 + (i % 2) * 5.9)
        top = Inches(2.0 + (i // 2) * 2.5)
        card = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(5.6), Inches(2.2))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY

        tb = s6.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), Inches(5.2), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = C_WHITE

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_GRAY
        p2.space_before = Pt(6)

    # SLIDE 7: Market & Benchmark
    s7 = prs.slides.add_slide(blank_layout)
    set_bg(s7)
    add_header(s7, "06 / Market & Benchmarks", "Target Audience & Strategic Competitive Positioning")

    tb = s7.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "TARGET AUDIENCE"
    p.font.bold = True
    p.font.size = Pt(14)
    p.font.color.rgb = C_RED

    audiences = [
        "Automotive Enthusiasts & Collectors seeking individuality",
        "Performance-oriented drivers wanting driver-focused technology",
        "Technology early adopters looking beyond mass-market EV offerings",
        "Boutique car buyers valuing design exclusivity"
    ]
    for aud in audiences:
        p2 = tf.add_paragraph()
        p2.text = f"•  {aud}"
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(10)

    tb2 = s7.shapes.add_textbox(Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p3 = tf2.paragraphs[0]
    p3.text = "INDUSTRY BENCHMARKS"
    p3.font.bold = True
    p3.font.size = Pt(14)
    p3.font.color.rgb = C_RED

    p4 = tf2.add_paragraph()
    p4.text = "Monitored Benchmarks: Porsche, BMW, Audi, Mercedes-Benz, Tesla, BYD, Xiaomi EV, and independent design studios."
    p4.font.size = Pt(12)
    p4.font.color.rgb = C_GRAY
    p4.space_before = Pt(10)

    p5 = tf2.add_paragraph()
    p5.text = "Veltron USP: Unified automotive design + in-house software development + agile European R&D model."
    p5.font.size = Pt(12)
    p5.font.color.rgb = C_WHITE
    p5.space_before = Pt(14)

    # SLIDE 8: Business Model
    s8 = prs.slides.add_slide(blank_layout)
    set_bg(s8)
    add_header(s8, "07 / Commercial Strategy", "Multi-Tiered Revenue Model")

    revs = [
        ("1. Limited Vehicle Production", "High-margin boutique production runs of Veltron vehicles."),
        ("2. Custom Automotive Design", "Concept development, 3D visualization, and design consulting."),
        ("3. V-Force Licensing", "Licensing propulsion architecture to third-party boutique makers."),
        ("4. SkyUI Software Platform", "Licensing digital cockpit HMI software to automotive partners."),
        ("5. R&D Partnerships", "Joint engineering projects with component suppliers & tech firms.")
    ]

    for i, (title, desc) in enumerate(revs):
        top = Inches(2.0 + i * 0.95)
        card = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top, Inches(11.7), Inches(0.8))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY

        tb = s8.shapes.add_textbox(Inches(1.0), top + Inches(0.15), Inches(11.3), Inches(0.5))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.bold = True
        p.font.size = Pt(13)
        p.font.color.rgb = C_WHITE
        run = p.add_run()
        run.text = f"  —  {desc}"
        run.font.bold = False
        run.font.color.rgb = C_GRAY

    # SLIDE 9: Global R&D Model
    s9 = prs.slides.add_slide(blank_layout)
    set_bg(s9)
    add_header(s9, "08 / Organizational Vision", "International Distributed R&D Footprint")

    hubs = [
        ("SERBIA (Belgrade)", "Core R&D / Engineering / Software Development Hub"),
        ("GERMANY", "Corporate Headquarters & Business Operations"),
        ("ITALY", "Automotive Styling & Exterior Design Center"),
        ("USA", "Advanced Software & Connected Services R&D")
    ]

    for i, (loc, role) in enumerate(hubs):
        left = Inches(0.8 + (i % 2) * 5.9)
        top = Inches(2.0 + (i // 2) * 2.4)
        card = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(5.6), Inches(2.0))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY

        tb = s9.shapes.add_textbox(left + Inches(0.3), top + Inches(0.3), Inches(5.0), Inches(1.4))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = loc
        p.font.bold = True
        p.font.size = Pt(15)
        p.font.color.rgb = C_RED

        p2 = tf.add_paragraph()
        p2.text = role
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(8)

    # SLIDE 10: Current Traction
    s10 = prs.slides.add_slide(blank_layout)
    set_bg(s10)
    add_header(s10, "09 / Traction & Validation", "Current R&D Milestones & Digital Proof of Concept")

    m_points = [
        ("Digital Vehicle Architecture", "Complete 3D surface modeling, chassis architecture, and render suites."),
        ("SkyUI Working Simulator", "Functional digital cockpit prototype running 21:9 HMI navigation, media, climate."),
        ("Media & Platform Recognition", "Featured on Autolooks automotive platform alongside established historic brands (Yugo, FAP)."),
        ("Technical Documentation", "Structured documentation covering powertrain, electronics, chassis, and software.")
    ]

    for i, (title, desc) in enumerate(m_points):
        left = Inches(0.8 + (i % 2) * 5.9)
        top = Inches(2.0 + (i // 2) * 2.5)
        card = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(5.6), Inches(2.2))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY

        tb = s10.shapes.add_textbox(left + Inches(0.25), top + Inches(0.25), Inches(5.1), Inches(1.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.bold = True
        p.font.size = Pt(14)
        p.font.color.rgb = C_WHITE

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_GRAY
        p2.space_before = Pt(8)

    # SLIDE 11: Roadmap & Capital Allocation
    s11 = prs.slides.add_slide(blank_layout)
    set_bg(s11)
    add_header(s11, "10 / Development Roadmap", "3-Phase Execution Plan & Capital Deployment")

    phases = [
        ("PHASE 01 — DIGITAL ENGINEERING (2026)", "In Progress", "CFD aerodynamic studies, 3D refinement, SkyUI software stack, technical specs."),
        ("PHASE 02 — PROTOTYPING (2026–2027)", "Planned", "Physical component prototypes, HMI hardware rig, powertrain proof-of-concept."),
        ("PHASE 03 — PHYSICAL VALIDATION (2027+)", "Future", "1:1 full-scale prototype, track testing, thermal/aerodynamic validation, pre-production.")
    ]

    for i, (title, status, desc) in enumerate(phases):
        top = Inches(2.0 + i * 1.5)
        card = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), top, Inches(11.7), Inches(1.3))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_DARK_GRAY

        tb = s11.shapes.add_textbox(Inches(1.0), top + Inches(0.15), Inches(11.3), Inches(1.0))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.bold = True
        p.font.size = Pt(13)
        p.font.color.rgb = C_RED

        run_st = p.add_run()
        run_st.text = f"  [{status}]"
        run_st.font.size = Pt(11)
        run_st.font.color.rgb = C_GRAY

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(11)
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(4)

    # SLIDE 12: Leadership & Closing
    s12 = prs.slides.add_slide(blank_layout)
    set_bg(s12)

    tb = s12.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(11.7), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "BORIS VLAJNIĆ"
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    p2 = tf.add_paragraph()
    p2.text = "Founder & Automotive Design Director"
    p2.font.size = Pt(16)
    p2.font.color.rgb = C_RED
    p2.space_before = Pt(6)

    p3 = tf.add_paragraph()
    p3.text = "Veltron Cars — Independent Automotive R&D Studio"
    p3.font.size = Pt(14)
    p3.font.color.rgb = C_GRAY
    p3.space_before = Pt(4)

    p4 = tf.add_paragraph()
    p4.text = '"Engineering Emotion. Defining Motion."'
    p4.font.size = Pt(20)
    p4.font.italic = True
    p4.font.color.rgb = C_WHITE
    p4.space_before = Pt(35)

    p5 = tf.add_paragraph()
    p5.text = "Contact: office@veltroncars.com  |  Belgrade, Serbia  |  veltroncars.com"
    p5.font.size = Pt(12)
    p5.font.color.rgb = C_GRAY
    p5.space_before = Pt(25)

    prs.save(output_path)
    print(f"Presentation saved to {output_path}")

if __name__ == "__main__":
    out = "Veltron_Auto_Pitch_Deck.pptx"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    create_veltron_deck(out)
