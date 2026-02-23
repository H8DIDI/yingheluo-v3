import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { Project } from '../types';

/**
 * Format date to YYYYMMDDHHmm
 */
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * Wait for a specified time
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FONT_URL = '/fonts/LXGWWenKai-Regular.ttf';
const FONT_NAME = 'LXGWWenKai';
let fontReady = false;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

async function ensureChineseFont(pdf: jsPDF) {
  if (fontReady) {
    pdf.setFont(FONT_NAME, 'normal');
    return;
  }

  const response = await fetch(FONT_URL);
  if (!response.ok) {
    throw new Error('字体文件加载失败');
  }

  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  pdf.addFileToVFS('LXGWWenKai-Regular.ttf', base64);
  pdf.addFont('LXGWWenKai-Regular.ttf', FONT_NAME, 'normal');
  pdf.setFont(FONT_NAME, 'normal');
  fontReady = true;
}

/**
 * Capture element as PNG using html-to-image (supports WebGL with preserveDrawingBuffer)
 */
async function captureElement(elementId: string, retries = 3): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element ${elementId} not found`);
    return null;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await wait(200);
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: elementId === 'map-editor-panel' ? '#0A0404' : '#0A0404',
        pixelRatio: 2,
        cacheBust: true,
      });
      if (dataUrl) return dataUrl;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === retries - 1) throw error;
      await wait(300);
    }
  }

  return null;
}

function addFullPageImage(pdf: jsPDF, dataUrl: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const props = pdf.getImageProperties(dataUrl);
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const scale = Math.min(maxWidth / props.width, maxHeight / props.height);
  const width = props.width * scale;
  const height = props.height * scale;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;

  pdf.addImage(dataUrl, 'PNG', x, y, width, height);
}

/**
 * Export project to PDF with visual layout
 * @param project - Project to export
 */
export async function exportToPDF(project: Project): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;
  const sortedCues = (project.cues || []).slice().sort((a, b) => a.startTime - b.startTime);
  await ensureChineseFont(pdf);
  pdf.setFont(FONT_NAME, 'normal');

  // Title
  pdf.setFontSize(24);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.text(project.name, margin, yPosition);
  yPosition += 10;

  // Metadata
  pdf.setFontSize(10);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.setTextColor(100);
  pdf.text(`生成时间: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  pdf.text(`总时长: ${Math.floor(project.duration / 60)}:${String(project.duration % 60).padStart(2, '0')}`, margin, yPosition);
  yPosition += 5;
  pdf.text(`烟花数: ${(project.cues || []).length}`, margin, yPosition);
  yPosition += 5;

  if (project.activityName) {
    pdf.text(`活动名称: ${project.activityName}`, margin, yPosition);
    yPosition += 5;
  }

  if (project.activityDetail) {
    const detailLines = pdf.splitTextToSize(`活动详情: ${project.activityDetail}`, pageWidth - 2 * margin);
    pdf.text(detailLines, margin, yPosition);
    yPosition += detailLines.length * 5;
  }

  yPosition += 10;

  let addedImagePage = false;
  try {
    const mapImgData = await captureElement('map-editor-panel');
    if (mapImgData) {
      pdf.addPage();
      addFullPageImage(pdf, mapImgData);
      addedImagePage = true;
    } else {
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text('二维平面图获取失败，请稍后重试。', margin, yPosition);
      yPosition += 5;
    }
  } catch (error) {
    console.error('Failed to capture map:', error);
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text('二维平面图获取失败，请稍后重试。', margin, yPosition);
    yPosition += 5;
  }

  try {
    const stageImgData = await captureElement('stage-3d-panel');
    if (stageImgData) {
      pdf.addPage();
      addFullPageImage(pdf, stageImgData);
      addedImagePage = true;
    } else {
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text('3D 视图获取失败，请稍后重试。', margin, yPosition);
      yPosition += 5;
    }
  } catch (error) {
    console.error('Failed to capture 3D stage:', error);
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text('3D 视图获取失败，请稍后重试。', margin, yPosition);
    yPosition += 5;
  }

  if (addedImagePage) {
    pdf.addPage();
    yPosition = margin;
  }

  // Cue List Table
  if (yPosition + 60 > pageHeight - margin) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.setTextColor(0);
  pdf.text('烟花列表', margin, yPosition);
  yPosition += 10;

  // Table headers
  pdf.setFontSize(9);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.text('#', margin, yPosition);
  pdf.text('名称', margin + 10, yPosition);
  pdf.text('效果', margin + 60, yPosition);
  pdf.text('轨道', margin + 100, yPosition);
  pdf.text('时间', margin + 120, yPosition);
  pdf.text('位置', margin + 140, yPosition);
  yPosition += 5;

  // Table rows
  pdf.setFont(FONT_NAME, 'normal');
  pdf.setFontSize(8);

  sortedCues
    .forEach((cue, index) => {
      if (yPosition > pageHeight - margin - 10) {
        pdf.addPage();
        yPosition = margin;

        // Repeat headers on new page
        pdf.setFont(FONT_NAME, 'normal');
        pdf.setFontSize(9);
        pdf.text('#', margin, yPosition);
        pdf.text('名称', margin + 10, yPosition);
        pdf.text('效果', margin + 60, yPosition);
        pdf.text('轨道', margin + 100, yPosition);
        pdf.text('时间', margin + 120, yPosition);
        pdf.text('位置', margin + 140, yPosition);
        yPosition += 5;
        pdf.setFont(FONT_NAME, 'normal');
        pdf.setFontSize(8);
      }

      // Color indicator
      pdf.setFillColor(cue.effect.color);
      pdf.circle(margin + 2, yPosition - 1.5, 1.5, 'F');

      // Cue data
      pdf.setTextColor(0);
      pdf.text(`${index + 1}`, margin + 5, yPosition);
      pdf.text(cue.name.substring(0, 20), margin + 10, yPosition);
      pdf.text(cue.effect.name.substring(0, 15), margin + 60, yPosition);
      pdf.text(cue.track, margin + 100, yPosition);
      pdf.text(
        `${Math.floor(cue.startTime / 60)}:${String(Math.floor(cue.startTime % 60)).padStart(2, '0')}`,
        margin + 120,
        yPosition
      );
      pdf.text(
        `(${cue.position.x.toFixed(0)}, ${cue.position.z.toFixed(0)})`,
        margin + 140,
        yPosition
      );

      yPosition += 5;
    });

  // Timeline snapshots (ordered by start time)
  if (yPosition > pageHeight - margin - 40) {
    pdf.addPage();
    yPosition = margin;
  }
  pdf.setFontSize(14);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.text('按时间排序的效果缩略', margin, yPosition);
  yPosition += 8;
  pdf.setFont(FONT_NAME, 'normal');
  pdf.setFontSize(9);

  sortedCues.forEach((cue, idx) => {
    if (yPosition > pageHeight - margin - 20) {
      pdf.addPage();
      yPosition = margin;
    }

    const rowHeight = 18;
    pdf.setFillColor(cue.effect.color);
    pdf.rect(margin, yPosition - 6, 6, 6, 'F');
    pdf.text(
      `${idx + 1}. ${cue.name} @ ${cue.startTime.toFixed(2)}s`,
      margin + 10,
      yPosition
    );
    pdf.text(`${cue.effect.name} (${cue.effect.type})`, margin + 60, yPosition);
    pdf.text(`Pos: (${cue.position.x.toFixed(1)}, ${cue.position.z.toFixed(1)})`, margin + 120, yPosition);
    yPosition += rowHeight;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `第 ${i} / ${totalPages} 页 | 萤合落 V1.0 烟花控制系统`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF with format: ProjectName_YYYYMMDDHHmm.pdf
  const sanitizedName = project.name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'firework_show';
  const timestamp = formatDateTime(new Date());
  const filename = `${sanitizedName}_${timestamp}.pdf`;
  pdf.save(filename);
}

/**
 * Export project data as JSON
 * @param project - Project to export
 */
export function exportToJSON(project: Project): void {
  const dataStr = JSON.stringify(project, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  const sanitizedName = project.name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'firework_show';
  const timestamp = formatDateTime(new Date());
  link.download = `${sanitizedName}_${timestamp}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Export cue list as CSV
 * @param project - Project to export
 */
export function exportToCSV(project: Project): void {
  const headers = ['#', 'Name', 'Effect', 'Type', 'Track', 'Start Time', 'Duration', 'X', 'Y', 'Z', 'Color', 'Intensity'];
  const rows = (project.cues || [])
    .sort((a, b) => a.startTime - b.startTime)
    .map((cue, index) => [
      index + 1,
      cue.name,
      cue.effect.name,
      cue.effect.type,
      cue.track,
      cue.startTime.toFixed(2),
      cue.effect.duration.toFixed(2),
      cue.position.x.toFixed(2),
      cue.position.y.toFixed(2),
      cue.position.z.toFixed(2),
      cue.effect.color,
      cue.effect.intensity.toFixed(2),
    ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const dataBlob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  const sanitizedName = project.name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'firework_show';
  const timestamp = formatDateTime(new Date());
  link.download = `${sanitizedName}_${timestamp}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
