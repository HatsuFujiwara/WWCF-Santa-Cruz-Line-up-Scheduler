import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Schedule, getAssignmentMembers } from '../types';
import { formatDateDisplayManila } from '../utils/dateUtils';

/**
 * Creates an offscreen DOM element containing the clean, minimal lineup template.
 */
function createExportElement(schedule: Schedule): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '640px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a'; // slate-900
  container.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';

  const praiseSongs = (schedule.praiseSongs || []).map((s) => s.trim()).filter(Boolean);
  const worshipSongs = (schedule.worshipSongs || []).map((s) => s.trim()).filter(Boolean);

  const assignments = schedule.ministryAssignments || [];

  let praiseHTML = '';
  if (praiseSongs.length > 0) {
    const items = praiseSongs.map((s, i) => `
      <li style="margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #1e293b;">
        <span style="font-weight: 700; color: #475569; margin-right: 6px;">${i + 1}.</span> ${escapeHtml(s)}
      </li>
    `).join('');
    praiseHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; text-align: left;">
          Praise
        </h2>
        <ol style="list-style: none; padding: 0; margin: 0; text-align: left;">
          ${items}
        </ol>
      </div>
    `;
  }

  let worshipHTML = '';
  if (worshipSongs.length > 0) {
    const items = worshipSongs.map((s, i) => `
      <li style="margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #1e293b;">
        <span style="font-weight: 700; color: #475569; margin-right: 6px;">${i + 1}.</span> ${escapeHtml(s)}
      </li>
    `).join('');
    worshipHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 10px 0; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; text-align: left;">
          Worship
        </h2>
        <ol style="list-style: none; padding: 0; margin: 0; text-align: left;">
          ${items}
        </ol>
      </div>
    `;
  }

  let teamHTML = '';
  if (assignments.length > 0) {
    const items = assignments.map((assignment) => {
      const rawMembers = getAssignmentMembers(assignment);
      const memberNames = rawMembers
        .map((m) => (m.memberName || '').trim())
        .filter((n) => Boolean(n) && n !== 'Unassigned' && n !== '—' && n !== 'N/A');

      const membersLines = memberNames.length > 0
        ? memberNames.map((name) => `
            <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.45; text-align: left;">
              ${escapeHtml(name)}
            </div>
          `).join('')
        : `<div style="font-size: 14px; font-weight: 600; color: #94a3b8; line-height: 1.45; text-align: left;">N/A</div>`;

      const notesHTML = assignment.notes ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px; text-align: left;">Note: ${escapeHtml(assignment.notes)}</div>` : '';

      return `
        <div style="text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; box-sizing: border-box;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #1b75bc; margin-bottom: 6px; text-align: left;">
            ${escapeHtml(assignment.role)}
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; text-align: left;">
            ${membersLines}
          </div>
          ${notesHTML}
        </div>
      `;
    }).join('');

    teamHTML = `
      <div>
        <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1b75bc; margin: 0 0 12px 0; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; text-align: left;">
          Worship Team
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: left;">
          ${items}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 28px; background: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #94a3b8;">
        <h1 style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin: 0 0 4px 0;">
          Word for the World Christian Fellowship – Santa Cruz
        </h1>
        <div style="font-size: 18px; font-weight: 800; color: #1b75bc; margin-bottom: 8px;">
          Worship Team Line-up
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #475569; display: flex; justify-content: center; gap: 16px;">
          <span><strong>Date:</strong> ${escapeHtml(schedule.serviceDate ? `${formatDateDisplayManila(schedule.serviceDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` : 'N/A')}</span>
          <span>•</span>
          <span><strong>Service:</strong> ${escapeHtml(schedule.serviceType || 'Sunday Service')}</span>
        </div>
      </div>

      <!-- Content -->
      ${praiseHTML}
      ${worshipHTML}
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
 * Export lineup as PDF document cropped dynamically to visible content.
 */
export async function exportLineupAsPDF(schedule: Schedule): Promise<void> {
  const canvas = await renderCanvas(schedule);
  const imgData = canvas.toDataURL('image/png');

  // Create a PDF with page size matching canvas dimensions (in px) so there is no extra blank space
  const width = canvas.width;
  const height = canvas.height;

  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height]
  });

  pdf.addImage(imgData, 'PNG', 0, 0, width, height);

  pdf.save(getExportFilename(schedule, 'pdf'));
}
