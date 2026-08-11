import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Schedule, MinistryAssignment, getAssignmentMembers } from '../types';
import { formatDateDisplayManila } from '../utils/dateUtils';

/**
 * Creates an offscreen DOM element containing the clean, minimal lineup template.
 */
function createExportElement(schedule: Schedule): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '720px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a'; // slate-900
  container.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '28px 32px';
  container.style.boxSizing = 'border-box';

  const praiseSongs = (schedule.praiseSongs || []).map((s) => s.trim()).filter(Boolean);
  const worshipSongs = (schedule.worshipSongs || []).map((s) => s.trim()).filter(Boolean);
  const assignments = schedule.ministryAssignments || [];

  // Extract Song Leaders and Backup Singers
  let praiseLeaders: string[] = [];
  let worshipLeaders: string[] = [];
  let genericLeaders: string[] = [];

  let praiseBackups: string[] = [];
  let worshipBackups: string[] = [];
  let genericBackups: string[] = [];

  let otherAssignments: MinistryAssignment[] = [];

  assignments.forEach((assignment) => {
    const roleLower = (assignment.role || '').toLowerCase().trim();
    const rawMembers = getAssignmentMembers(assignment);
    const names = rawMembers
      .map((m) => (m.memberName || '').trim())
      .filter((n) => Boolean(n) && n !== 'Unassigned' && n !== '—' && n !== 'N/A');

    const isSongLeader =
      roleLower.includes('song leader') ||
      roleLower.includes('worship leader') ||
      roleLower.includes('praise leader');

    const isBackupSinger =
      roleLower.includes('backup') || roleLower.includes('vocalist') || roleLower.includes('singer');

    if (isSongLeader) {
      if (roleLower.includes('praise') && roleLower.includes('worship')) {
        genericLeaders.push(...names);
      } else if (roleLower.includes('praise')) {
        praiseLeaders.push(...names);
      } else if (roleLower.includes('worship')) {
        worshipLeaders.push(...names);
      } else {
        genericLeaders.push(...names);
      }
    } else if (isBackupSinger) {
      if (roleLower.includes('praise') && roleLower.includes('worship')) {
        genericBackups.push(...names);
      } else if (roleLower.includes('praise')) {
        praiseBackups.push(...names);
      } else if (roleLower.includes('worship')) {
        worshipBackups.push(...names);
      } else {
        genericBackups.push(...names);
      }
    } else {
      otherAssignments.push(assignment);
    }
  });

  const allLeaderNames = [
    ...praiseLeaders,
    ...worshipLeaders,
    ...genericLeaders
  ].filter((v, i, a) => a.indexOf(v) === i);

  const hasTwoSeparateLeaders =
    (praiseLeaders.length > 0 && worshipLeaders.length > 0) ||
    praiseLeaders.length >= 2 ||
    worshipLeaders.length >= 2 ||
    (praiseLeaders.length > 0 && genericLeaders.length > 0) ||
    (worshipLeaders.length > 0 && genericLeaders.length > 0) ||
    genericLeaders.length >= 2;

  let mainBodyHTML = '';

  const praiseItems = praiseSongs.length > 0
    ? praiseSongs.map((s, i) => `
        <li style="font-size: 13px; font-weight: 500; color: #1e293b; line-height: 1.45; word-break: break-word; overflow-wrap: anywhere;">
          <span style="font-weight: 700; color: #1b75bc; margin-right: 6px;">${i + 1}.</span>${escapeHtml(s)}
        </li>
      `).join('')
    : '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">N/A</div>';

  const worshipItems = worshipSongs.length > 0
    ? worshipSongs.map((s, i) => `
        <li style="font-size: 13px; font-weight: 500; color: #1e293b; line-height: 1.45; word-break: break-word; overflow-wrap: anywhere;">
          <span style="font-weight: 700; color: #1b75bc; margin-right: 6px;">${i + 1}.</span>${escapeHtml(s)}
        </li>
      `).join('')
    : '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">N/A</div>';

  if (hasTwoSeparateLeaders) {
    // TWO SONG LEADERS: 2-column layout (Left: Praise, Right: Worship)
    const pLeaders = praiseLeaders.length > 0 ? praiseLeaders : (genericLeaders[0] ? [genericLeaders[0]] : []);
    const wLeaders = worshipLeaders.length > 0 ? worshipLeaders : (genericLeaders[1] ? [genericLeaders[1]] : []);

    const praiseLeaderLines = pLeaders.length > 0
      ? pLeaders.map(n => `<div style="font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('')
      : '<div style="font-size: 13px; font-weight: 500; color: #94a3b8;">N/A</div>';

    const worshipLeaderLines = wLeaders.length > 0
      ? wLeaders.map(n => `<div style="font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('')
      : '<div style="font-size: 13px; font-weight: 500; color: #94a3b8;">N/A</div>';

    const praiseBackupLines = praiseBackups.length > 0
      ? praiseBackups.map(n => `<div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.45; margin-bottom: 3px; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('')
      : (genericBackups.length > 0 ? genericBackups.map(n => `<div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.45; margin-bottom: 3px; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('') : '<div style="font-size: 13px; font-weight: 500; color: #94a3b8;">N/A</div>');

    const worshipBackupLines = worshipBackups.length > 0
      ? worshipBackups.map(n => `<div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.45; margin-bottom: 3px; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('')
      : (genericBackups.length > 0 ? genericBackups.map(n => `<div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.45; margin-bottom: 3px; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('') : '<div style="font-size: 13px; font-weight: 500; color: #94a3b8;">N/A</div>');

    mainBodyHTML = `
      <div style="display: flex; gap: 16px; margin-bottom: 20px; align-items: stretch; break-inside: avoid; page-break-inside: avoid;">
        <!-- Left Column: Praise -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-sizing: border-box;">
          <div>
            <h2 style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
              Praise
            </h2>
            <ol style="list-style: none; padding: 0; margin: 0; text-align: left; display: flex; flex-direction: column; gap: 5px;">
              ${praiseItems}
            </ol>
          </div>
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: left; display: flex; flex-direction: column; gap: 12px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px;">
                Song Leader (Praise)
              </div>
              ${praiseLeaderLines}
            </div>
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px;">
                Backup Singer/s (Praise)
              </div>
              ${praiseBackupLines}
            </div>
          </div>
        </div>

        <!-- Right Column: Worship -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-sizing: border-box;">
          <div>
            <h2 style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
              Worship
            </h2>
            <ol style="list-style: none; padding: 0; margin: 0; text-align: left; display: flex; flex-direction: column; gap: 5px;">
              ${worshipItems}
            </ol>
          </div>
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: left; display: flex; flex-direction: column; gap: 12px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px;">
                Song Leader (Worship)
              </div>
              ${worshipLeaderLines}
            </div>
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px;">
                Backup Singer/s (Worship)
              </div>
              ${worshipBackupLines}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // ONE SONG LEADER: Praise & Worship songs side by side, with shared Vocalists section below
    const singleLeaderNames = allLeaderNames.length > 0 ? allLeaderNames : [];
    const leaderLines = singleLeaderNames.length > 0
      ? singleLeaderNames.map(n => `<div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('')
      : '<div style="font-size: 13px; font-weight: 500; color: #94a3b8;">N/A</div>';

    const allBackupNames = [...genericBackups, ...praiseBackups, ...worshipBackups].filter((v, i, a) => a.indexOf(v) === i);
    const backupLines = allBackupNames.length > 0
      ? allBackupNames.map(n => `<div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.45; margin-bottom: 3px; word-break: break-word; overflow-wrap: anywhere;">${escapeHtml(n)}</div>`).join('')
      : '<div style="font-size: 13px; font-weight: 500; color: #94a3b8;">N/A</div>';

    mainBodyHTML = `
      <div style="display: flex; gap: 16px; margin-bottom: 16px; align-items: stretch; break-inside: avoid; page-break-inside: avoid;">
        <!-- Left Column: Praise Songs -->
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-sizing: border-box;">
          <h2 style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
            Praise
          </h2>
          <ol style="list-style: none; padding: 0; margin: 0; text-align: left; display: flex; flex-direction: column; gap: 5px;">
            ${praiseItems}
          </ol>
        </div>

        <!-- Right Column: Worship Songs -->
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-sizing: border-box;">
          <h2 style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
            Worship
          </h2>
          <ol style="list-style: none; padding: 0; margin: 0; text-align: left; display: flex; flex-direction: column; gap: 5px;">
            ${worshipItems}
          </ol>
        </div>
      </div>

      <!-- Single Vocalists Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; box-sizing: border-box; text-align: left; break-inside: avoid; page-break-inside: avoid;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px;">
          Song Leader (Praise/Worship)
        </div>
        ${leaderLines}
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px;">
            Backup Singer/s
          </div>
          ${backupLines}
        </div>
      </div>
    `;
  }

  // Worship Team Assignments section
  let teamHTML = '';
  if (otherAssignments.length > 0) {
    const exportRoleKeywords = [
      'guitarist',
      'keyboardist',
      'bassist',
      'drummer',
      'audio',
      'tech',
      'lyricist'
    ];

    otherAssignments.sort((a, b) => {
      const rA = (a.role || '').toLowerCase().trim();
      const rB = (b.role || '').toLowerCase().trim();

      const getRank = (r: string) => {
        const idx = exportRoleKeywords.findIndex((kw) => r.includes(kw));
        return idx !== -1 ? idx : 999;
      };

      const rankA = getRank(rA);
      const rankB = getRank(rB);

      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return rA.localeCompare(rB);
    });

    const items = otherAssignments.map((assignment) => {
      const rawMembers = getAssignmentMembers(assignment);
      const memberNames = rawMembers
        .map((m) => (m.memberName || '').trim())
        .filter((n) => Boolean(n) && n !== 'Unassigned' && n !== '—' && n !== 'N/A');

      const membersLines = memberNames.length > 0
        ? memberNames.map((name) => `
            <div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.4; text-align: left; word-break: break-word; overflow-wrap: anywhere;">
              ${escapeHtml(name)}
            </div>
          `).join('')
        : `<div style="font-size: 13px; font-weight: 500; color: #94a3b8; line-height: 1.4; text-align: left;">N/A</div>`;

      const notesHTML = assignment.notes ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 3px; text-align: left;">Note: ${escapeHtml(assignment.notes)}</div>` : '';

      return `
        <div style="text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 3px; text-align: left;">
            ${escapeHtml(assignment.role)}
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px; text-align: left;">
            ${membersLines}
          </div>
          ${notesHTML}
        </div>
      `;
    }).join('');

    teamHTML = `
      <div style="break-inside: avoid; page-break-inside: avoid;">
        <h2 style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
          Worship Team
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; text-align: left;">
          ${items}
        </div>
      </div>
    `;
  }

  const formattedDate = schedule.serviceDate
    ? formatDateDisplayManila(schedule.serviceDate, { month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A';

  container.innerHTML = `
    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px 32px; background: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 4px;">
          Word for the World Christian Fellowship &ndash; Santa Cruz
        </div>
        <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.01em;">
          Worship Team Line-up
        </h1>
        <div style="font-size: 12.5px; font-weight: 500; color: #475569;">
          ${escapeHtml(formattedDate)} &nbsp;&bull;&nbsp; ${escapeHtml(schedule.serviceType || 'Sunday Service')}
        </div>
        <div style="height: 1px; background-color: #e2e8f0; margin-top: 14px;"></div>
      </div>

      <!-- Content -->
      ${mainBodyHTML}
      ${teamHTML}
    </div>
  `;

  return container;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function renderCanvas(schedule: Schedule): Promise<HTMLCanvasElement> {
  const element = createExportElement(schedule);
  document.body.appendChild(element);

  // Wait for DOM layout
  await new Promise((resolve) => setTimeout(resolve, 50));

  const canvas = await html2canvas(element, {
    scale: 3, // High resolution for mobile sharing & printing
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  document.body.removeChild(element);
  return canvas;
}

/**
 * Generates dynamic filename based on service type and scheduled date (MM-DD-YYYY).
 */
export function getExportFilename(schedule: Schedule, extension: 'pdf' | 'png'): string {
  const serviceType = (schedule.serviceType || 'Sunday Service').trim();
  const serviceDate = schedule.serviceDate || '';

  // Format date as MM-DD-YYYY
  let formattedDate = 'MM-DD-YYYY';
  if (serviceDate) {
    const parts = serviceDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      formattedDate = `${month}-${day}-${year}`;
    }
  }

  let prefix = '';
  if (serviceType === 'Sunday Service') {
    prefix = 'Sunday_Service_Line-up';
  } else if (serviceType === 'Midweek Prayer Service') {
    prefix = 'Midweek_Prayer_Service_Line-up';
  } else if (serviceType === 'Youth Fellowship' || serviceType === 'Youth Service') {
    prefix = 'Youth_Fellowship';
  } else if (serviceType === 'Worship Event' || serviceType === 'Special Worship Event') {
    prefix = 'Worship_Event';
  } else {
    // Fallback: replace spaces with underscores
    prefix = serviceType.replace(/\s+/g, '_');
  }

  return `${prefix}_(${formattedDate}).${extension}`;
}

/**
 * Export lineup as PNG image cropped dynamically to visible content.
 */
export async function exportLineupAsPNG(schedule: Schedule): Promise<void> {
  const canvas = await renderCanvas(schedule);
  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = getExportFilename(schedule, 'png');
  link.href = dataUrl;
  link.click();
}

/**
 * Export lineup as PDF document formatted for standard A4 printable layout.
 */
export async function exportLineupAsPDF(schedule: Schedule): Promise<void> {
  const canvas = await renderCanvas(schedule);
  const imgData = canvas.toDataURL('image/png');

  // Standard A4 orientation
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const margin = 10; // 10mm margins
  const printableWidth = pdfWidth - margin * 2; // 190mm
  const printableHeight = pdfHeight - margin * 2; // 277mm

  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * printableWidth) / canvas.width;

  if (imgHeight <= printableHeight) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
  } else {
    let heightRemaining = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightRemaining -= printableHeight;

    while (heightRemaining > 0) {
      position -= 297; // Shift offset by full A4 page height
      pdf.addPage('a4', 'portrait');
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightRemaining -= printableHeight;
    }
  }

  pdf.save(getExportFilename(schedule, 'pdf'));
}
