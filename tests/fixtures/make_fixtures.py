"""Generates synthetic CV fixtures for automated tests. All people/companies are fictional."""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import docx

LINES = [
    "Jordan Example",
    "Senior Platform Engineer",
    "jordan.example@example.com | +44 7700 900123 | London, UK | linkedin.com/in/jordan-example",
    "",
    "PROFILE",
    "Platform engineer with experience building Kubernetes and AWS infrastructure for payments companies.",
    "",
    "EXPERIENCE",
    "Senior Platform Engineer, Acmepay Ltd, Jan 2019 - Present",
    "Led migration of 40 services to Kubernetes (EKS) using Terraform; reduced infrastructure costs by 25%.",
    "DevOps Engineer, Northwind Health, Mar 2015 - Dec 2018",
    "Built CI/CD pipelines with GitHub Actions and Docker; introduced Prometheus and Grafana monitoring.",
    "",
    "EDUCATION",
    "BSc Computer Science, University of Exampleshire, 2014",
    "",
    "CERTIFICATIONS",
    "AWS Certified Solutions Architect - Professional, 2022",
    "",
    "SKILLS",
    "AWS, Kubernetes, Terraform, Docker, Python, Go, PostgreSQL, CI/CD, Linux",
]

c = canvas.Canvas("cv-sample.pdf", pagesize=A4)
y = 800
for line in LINES:
    c.drawString(50, y, line)
    y -= 18
c.save()

d = docx.Document()
for line in LINES:
    d.add_paragraph(line)
d.save("cv-sample.docx")

# Image-only style PDF (no text layer) to exercise the OCR path
c = canvas.Canvas("cv-scanned.pdf", pagesize=A4)
c.rect(50, 600, 400, 150, fill=1)
c.save()

open("not-a-cv.pdf", "wb").write(b"MZ\x90\x00 this is not a pdf, it is a renamed executable")
print("fixtures written")
