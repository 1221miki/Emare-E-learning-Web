/**
 * certificateService.js
 *
 * ONE fixed, premium certificate design used for ALL courses and ALL students.
 *
 * Fixed (never changes):
 *   - Layout, colors, borders, typography, logo text, seal, footer structure
 *
 * Dynamic per certificate:
 *   - studentName, courseName, certificateId, issueDate, completionDate,
 *     issuerName, QR code / verification URL
 *
 * PDF spec: A4 landscape, print-ready, ~297×210 mm at 72 dpi = 841×595 pt
 */

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');
const qrcode      = require('qrcode');
const CertificateCounter = require('../models/CertificateCounter');

// ── Palette (fixed for every certificate) ────────────────────────────────────
const C = {
    navy:       '#0d1b4b',   // deep navy  — primary brand dark
    blue:       '#1e3a8a',   // royal blue — header / accent
    gold:       '#c9a84c',   // warm gold  — outer border, lines, seals
    goldLight:  '#e8c97a',   // light gold — inner border, ornaments
    teal:       '#0f766e',   // teal       — course name accent
    white:      '#ffffff',
    offWhite:   '#fafaf7',   // warm off-white background
    darkText:   '#111827',
    midText:    '#374151',
    mutedText:  '#6b7280',
    lightLine:  '#d1d5db',
};

// ── Atomic sequential ID ──────────────────────────────────────────────────────

/**
 * generateCertificateId()
 * Atomically increments a per-year counter in MongoDB.
 * Format: EMARE-CERT-2026-000001
 */
async function generateCertificateId() {
    const year = new Date().getFullYear();
    const key  = `EMARE-CERT-${year}`;
    const counter = await CertificateCounter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    const padded = String(counter.seq).padStart(6, '0');
    return `EMARE-CERT-${year}-${padded}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Draw a rounded rectangle path */
function roundedRect(doc, x, y, w, h, r) {
    doc.moveTo(x + r, y)
       .lineTo(x + w - r, y)
       .quadraticCurveTo(x + w, y, x + w, y + r)
       .lineTo(x + w, y + h - r)
       .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
       .lineTo(x + r, y + h)
       .quadraticCurveTo(x, y + h, x, y + h - r)
       .lineTo(x, y + r)
       .quadraticCurveTo(x, y, x + r, y)
       .closePath();
}

/** Draw a centred horizontal line */
function hLine(doc, y, x1, x2, color, width) {
    doc.save()
       .moveTo(x1, y).lineTo(x2, y)
       .lineWidth(width).strokeColor(color).stroke()
       .restore();
}

/** Draw a small diamond ornament */
function diamond(doc, cx, cy, size, color) {
    doc.save()
       .moveTo(cx, cy - size)
       .lineTo(cx + size, cy)
       .lineTo(cx, cy + size)
       .lineTo(cx - size, cy)
       .closePath()
       .fillColor(color).fill()
       .restore();
}

/** Return QR code as a Buffer (PNG) */
async function qrBuffer(url) {
    const dataUrl = await qrcode.toDataURL(url, {
        width: 120, margin: 1,
        color: { dark: C.navy, light: C.white }
    });
    return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

// ── Main PDF generator ────────────────────────────────────────────────────────

/**
 * generateCertificatePdf(opts)
 *
 * @param {string} opts.studentName
 * @param {string} opts.courseName
 * @param {string} opts.issuerName       — e.g. "Emare ICT Hub"
 * @param {Date}   opts.issueDate
 * @param {string} opts.certificateId    — ALWAYS from DB record
 * @param {Date}   [opts.completionDate]
 * @param {string} [opts.signerTitle]    — signer's job title
 * @returns {Promise<{ filePath, filename, verifyUrl }>}
 */
async function generateCertificatePdf({
    studentName,
    courseName,
    issuerName   = 'Emare ICT Hub',
    issueDate,
    certificateId,
    completionDate,
    signerTitle  = 'Chief Learning Officer'
}) {
    // ── Output path ───────────────────────────────────────────────────────────
    const certsDir = path.join(__dirname, '..', 'public', 'certificates');
    if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });
    const filename = `${certificateId}.pdf`;
    const filePath = path.join(certsDir, filename);

    // ── Verification URL ──────────────────────────────────────────────────────
    const frontendBase = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
    const verifyUrl    = `${frontendBase}/verify-certificate/${certificateId}`;

    // ── Date strings ──────────────────────────────────────────────────────────
    const issueDateStr = new Date(issueDate || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const completionDateStr = completionDate
        ? new Date(completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : issueDateStr;

    return new Promise(async (resolve, reject) => {
        try {
            // ── Document setup ────────────────────────────────────────────────
            const doc = new PDFDocument({
                size:    'A4',
                layout:  'landscape',
                margin:  0,
                info: {
                    Title:    `Certificate of Completion — ${courseName}`,
                    Author:   'Emare ICT Hub',
                    Subject:  `Certificate for ${studentName}`,
                    Keywords: `certificate completion ${certificateId}`
                }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const W = doc.page.width;   // 841.89 pt
            const H = doc.page.height;  // 595.28 pt

            // ════════════════════════════════════════════════════════════════
            // LAYER 1 — Solid cream background
            // ════════════════════════════════════════════════════════════════
            doc.rect(0, 0, W, H).fill(C.offWhite);

            // ════════════════════════════════════════════════════════════════
            // LAYER 2 — Navy left + right side panels (decorative)
            // ════════════════════════════════════════════════════════════════
            doc.rect(0, 0, 58, H).fill(C.navy);
            doc.rect(W - 58, 0, 58, H).fill(C.navy);

            // Gold vertical accent lines on panels
            doc.save()
               .moveTo(54, 0).lineTo(54, H).lineWidth(2).strokeColor(C.gold).stroke()
               .restore();
            doc.save()
               .moveTo(W - 54, 0).lineTo(W - 54, H).lineWidth(2).strokeColor(C.gold).stroke()
               .restore();

            // Small gold diamond ornaments on panels
            for (let yy = 60; yy < H - 40; yy += 70) {
                diamond(doc, 29, yy, 5, C.goldLight);
                diamond(doc, W - 29, yy, 5, C.goldLight);
            }

            // ════════════════════════════════════════════════════════════════
            // LAYER 3 — Double gold outer border (inside the panels)
            // ════════════════════════════════════════════════════════════════
            doc.save();
            roundedRect(doc, 66, 16, W - 132, H - 32, 8);
            doc.lineWidth(3).strokeColor(C.gold).stroke();
            doc.restore();

            doc.save();
            roundedRect(doc, 72, 22, W - 144, H - 44, 5);
            doc.lineWidth(1).strokeColor(C.goldLight).stroke();
            doc.restore();

            // ════════════════════════════════════════════════════════════════
            // LAYER 4 — Navy header band
            // ════════════════════════════════════════════════════════════════
            const HEADER_H = 88;
            doc.save();
            doc.rect(66, 16, W - 132, HEADER_H).fill(C.navy);
            doc.restore();

            // Gold bottom edge of header band
            hLine(doc, 16 + HEADER_H, 66, W - 66, C.gold, 2.5);

            // ── Platform name (top-left inside header) ────────────────────
            doc.save()
               .font('Helvetica-Bold')
               .fontSize(9)
               .fillColor(C.goldLight)
               .text('EMARE ICT HUB', 86, 30, {
                   characterSpacing: 3,
                   width: 180
               })
               .restore();

            // ── Thin gold underline below platform name ───────────────────
            hLine(doc, 46, 86, 230, C.gold, 0.75);

            // ── Sub-label ─────────────────────────────────────────────────
            doc.save()
               .font('Helvetica')
               .fontSize(7.5)
               .fillColor('#94a3b8')
               .text('ETHIOPIAN TECH LEARNING PLATFORM', 86, 50, {
                   characterSpacing: 1.5, width: 240
               })
               .restore();

            // ── Big certificate title (centred in header) ─────────────────
            doc.save()
               .font('Helvetica-Bold')
               .fontSize(30)
               .fillColor(C.white)
               .text('CERTIFICATE OF COMPLETION', 0, 32, {
                   align: 'center',
                   width: W,
                   characterSpacing: 2
               })
               .restore();

            // ── Thin gold ornament lines flanking the title ───────────────
            hLine(doc, 75, 86, W / 2 - 210, C.gold, 0.75);
            hLine(doc, 75, W / 2 + 210, W - 86, C.gold, 0.75);
            diamond(doc, W / 2, 75, 4.5, C.gold);

            // ════════════════════════════════════════════════════════════════
            // LAYER 5 — Gold seal / badge (top-right corner of header)
            // ════════════════════════════════════════════════════════════════
            const SX = W - 86 - 52;  // right-side position
            const SY = 26;
            const SR = 34;

            // Outer gear-like ring
            doc.save().circle(SX, SY + SR, SR + 6).lineWidth(2).strokeColor(C.gold).stroke().restore();
            doc.save().circle(SX, SY + SR, SR + 2).lineWidth(1).strokeColor(C.goldLight).stroke().restore();

            // Filled circle
            doc.save().circle(SX, SY + SR, SR).fillColor(C.navy).fill().restore();

            // Inner ring
            doc.save().circle(SX, SY + SR, SR - 5).lineWidth(0.8).strokeColor(C.goldLight).stroke().restore();

            // Seal text
            doc.save()
               .font('Helvetica-Bold')
               .fontSize(5.5)
               .fillColor(C.gold)
               .text('★  CERTIFIED  ★', SX - 26, SY + SR - 14, { width: 52, align: 'center', characterSpacing: 0.5 })
               .font('Helvetica-Bold')
               .fontSize(10)
               .fillColor(C.white)
               .text('EMARE', SX - 26, SY + SR - 5, { width: 52, align: 'center' })
               .font('Helvetica')
               .fontSize(5)
               .fillColor(C.goldLight)
               .text('ICT HUB', SX - 26, SY + SR + 7, { width: 52, align: 'center', characterSpacing: 1 })
               .restore();

            // ════════════════════════════════════════════════════════════════
            // LAYER 6 — Body content
            // ════════════════════════════════════════════════════════════════
            let bodyY = 16 + HEADER_H + 26;

            // ── "This certificate is proudly presented to" ────────────────
            doc.save()
               .font('Helvetica')
               .fontSize(12)
               .fillColor(C.midText)
               .text('This certificate is proudly presented to', 0, bodyY, {
                   align: 'center', width: W
               })
               .restore();

            bodyY += 22;

            // ── Student name ──────────────────────────────────────────────
            // Dynamic value — large, bold, with gold underline
            const sName = (studentName || 'Student Name').toUpperCase();
            doc.save()
               .font('Helvetica-Bold')
               .fontSize(34)
               .fillColor(C.navy)
               .text(sName, 80, bodyY, {
                   align: 'center', width: W - 160
               })
               .restore();

            bodyY += 46;

            // Gold underline beneath student name
            const nameWidth = Math.min((sName.length * 18), 420);
            const nameX     = (W - nameWidth) / 2;
            hLine(doc, bodyY, nameX, nameX + nameWidth, C.gold, 1.5);
            diamond(doc, nameX, bodyY, 4, C.gold);
            diamond(doc, nameX + nameWidth, bodyY, 4, C.gold);

            bodyY += 18;

            // ── "for successfully completing" ─────────────────────────────
            doc.save()
               .font('Helvetica')
               .fontSize(12)
               .fillColor(C.midText)
               .text('for successfully completing', 0, bodyY, {
                   align: 'center', width: W
               })
               .restore();

            bodyY += 20;

            // ── Course name (teal, prominent) ─────────────────────────────
            doc.save()
               .font('Helvetica-Bold')
               .fontSize(19)
               .fillColor(C.teal)
               .text(courseName || 'Course Title', 80, bodyY, {
                   align: 'center', width: W - 160
               })
               .restore();

            bodyY += 32;

            // ── "and has demonstrated the required skills..." ─────────────
            doc.save()
               .font('Helvetica-Oblique')
               .fontSize(10)
               .fillColor(C.mutedText)
               .text(
                   'and has demonstrated the knowledge, skills, and dedication required to earn this credential.',
                   80, bodyY,
                   { align: 'center', width: W - 160 }
               )
               .restore();

            bodyY += 28;

            // ════════════════════════════════════════════════════════════════
            // LAYER 7 — Divider with ornaments
            // ════════════════════════════════════════════════════════════════
            hLine(doc, bodyY, 80, W - 80, C.lightLine, 0.75);
            diamond(doc, W / 2, bodyY, 5, C.gold);
            diamond(doc, 80, bodyY, 3.5, C.goldLight);
            diamond(doc, W - 80, bodyY, 3.5, C.goldLight);

            bodyY += 18;

            // ════════════════════════════════════════════════════════════════
            // LAYER 8 — Bottom info row: Signature | Details | QR
            // ════════════════════════════════════════════════════════════════
            const COL_W = (W - 160) / 3;   // width of each of 3 columns
            const COL1  = 86;              // left column x
            const COL2  = COL1 + COL_W + 20;
            const COL3  = COL2 + COL_W + 20;
            const INFO_Y = bodyY;

            // ── Column 1: Signature ───────────────────────────────────────
            // Stylised signature line
            const sigY = INFO_Y + 28;
            doc.save()
               .font('Helvetica-Oblique')
               .fontSize(16)
               .fillColor(C.navy)
               .text(issuerName || 'Emare ICT Hub', COL1, INFO_Y + 4, { width: COL_W })
               .restore();

            hLine(doc, sigY, COL1, COL1 + COL_W, C.navy, 0.8);

            doc.save()
               .font('Helvetica-Bold')
               .fontSize(9)
               .fillColor(C.darkText)
               .text(issuerName || 'Emare ICT Hub', COL1, sigY + 5, { width: COL_W })
               .restore();

            doc.save()
               .font('Helvetica')
               .fontSize(8.5)
               .fillColor(C.mutedText)
               .text(signerTitle, COL1, sigY + 17, { width: COL_W })
               .restore();

            doc.save()
               .font('Helvetica')
               .fontSize(8)
               .fillColor(C.mutedText)
               .text('Emare ICT Hub', COL1, sigY + 28, { width: COL_W })
               .restore();

            // ── Column 2: Certificate details ─────────────────────────────
            const detailLineH = 14;
            const fields = [
                { label: 'CERTIFICATE ID',    value: certificateId },
                { label: 'ISSUE DATE',        value: issueDateStr },
                { label: 'COMPLETION DATE',   value: completionDateStr },
                { label: 'ISSUING AUTHORITY', value: 'Emare ICT Hub' },
            ];

            fields.forEach((f, i) => {
                const fy = INFO_Y + i * detailLineH;
                doc.save()
                   .font('Helvetica-Bold')
                   .fontSize(6.5)
                   .fillColor(C.mutedText)
                   .text(f.label, COL2, fy, { width: COL_W, characterSpacing: 0.5 })
                   .restore();
                doc.save()
                   .font('Helvetica-Bold')
                   .fontSize(9)
                   .fillColor(C.darkText)
                   .text(f.value, COL2, fy + 7, { width: COL_W })
                   .restore();
            });

            // ── Column 3: QR code ─────────────────────────────────────────
            try {
                const qrBuf = await qrBuffer(verifyUrl);
                const QR_SIZE = 72;
                doc.image(qrBuf, COL3, INFO_Y - 4, { width: QR_SIZE, height: QR_SIZE });

                doc.save()
                   .font('Helvetica-Bold')
                   .fontSize(6.5)
                   .fillColor(C.mutedText)
                   .text('SCAN TO VERIFY', COL3, INFO_Y + QR_SIZE, {
                       width: QR_SIZE, align: 'center', characterSpacing: 0.5
                   })
                   .restore();
            } catch (qrErr) {
                console.warn('[certificateService] QR failed:', qrErr.message);
            }

            // ════════════════════════════════════════════════════════════════
            // LAYER 9 — Navy footer strip
            // ════════════════════════════════════════════════════════════════
            const FOOTER_H = 26;
            const FOOTER_Y = H - 16 - FOOTER_H;

            doc.save().rect(66, FOOTER_Y, W - 132, FOOTER_H).fill(C.navy).restore();
            hLine(doc, FOOTER_Y, 66, W - 66, C.gold, 1.5);

            doc.save()
               .font('Helvetica')
               .fontSize(7.5)
               .fillColor('#94a3b8')
               .text(
                   `Verify this certificate online at: ${verifyUrl}   |   Certificate ID: ${certificateId}   |   © ${new Date().getFullYear()} Emare ICT Hub`,
                   78,
                   FOOTER_Y + 8,
                   { width: W - 156, align: 'center' }
               )
               .restore();

            // ── Finish ────────────────────────────────────────────────────
            doc.end();
            stream.on('finish', () => resolve({ filePath, filename, verifyUrl }));
            stream.on('error', reject);

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateCertificatePdf, generateCertificateId };
