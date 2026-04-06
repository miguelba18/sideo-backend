import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as puppeteer from 'puppeteer-core';
import { Report } from './entities/report.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { EvaluationDetail } from '../evaluations/entities/evaluacion-detail.entity';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class ReportsService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
    @InjectRepository(EvaluationDetail)
    private readonly detailRepo: Repository<EvaluationDetail>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL')!,
      this.config.get('SUPABASE_SERVICE_KEY')!,
    );
    this.bucket = this.config.get('SUPABASE_BUCKET')!;
  }
  private sanitizeFileName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
} 

  async generateFromEvaluation(
    evaluationId: string,
    companyId: string,
    generatedById: string,
  ): Promise<Report> {
    const evaluation = await this.evaluationRepo.findOne({
      where: { id: evaluationId, companyId },
      relations: ['employee', 'evaluator'],
    });

    if (!evaluation) throw new NotFoundException('Evaluación no encontrada');

    const detail = await this.detailRepo.findOne({ where: { evaluationId } });
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    const html = this.buildHtml(evaluation, detail, company);
    const pdfBuffer = await this.renderPdf(html);

   const lastName = this.sanitizeFileName(evaluation.employee.lastName);
const firstName = this.sanitizeFileName(evaluation.employee.firstName);
const fileName = `${companyId}/ROSA_${lastName}_${firstName}_${Date.now()}.pdf`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(`Error al subir PDF a Supabase: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(fileName);

    const report = this.reportRepo.create({
      evaluationId,
      generatedById,
      companyId,
      fileName,
      publicUrl: urlData.publicUrl,
    });

    return this.reportRepo.save(report);
  }

  async findByEvaluation(evaluationId: string) {
    return this.reportRepo.findOne({
      where: { evaluationId },
      select: ['id', 'fileName', 'publicUrl', 'createdAt'],
    });
  }

  async findAllByCompany(companyId: string) {
    const reports = await this.reportRepo.find({
      where: { companyId },
      relations: ['evaluation', 'evaluation.employee', 'generatedBy'],
      order: { createdAt: 'DESC' },
    });

    return reports.map((r) => ({
      id: r.id,
      fileName: r.fileName.split('/').pop(),
      publicUrl: r.publicUrl,
      employee: `${r.evaluation.employee.firstName} ${r.evaluation.employee.lastName}`,
      area: r.evaluation.employee.area,
      rosaFinal: r.evaluation.rosaFinal,
      riskLevel: r.evaluation.riskLevel,
      generatedBy: `${r.generatedBy.firstName} ${r.generatedBy.lastName}`,
      createdAt: r.createdAt,
    }));
  }

  async findOne(reportId: string, companyId: string) {
    const report = await this.reportRepo.findOne({
      where: { id: reportId, companyId },
      relations: ['evaluation', 'evaluation.employee', 'generatedBy'],
    });

    if (!report) throw new NotFoundException('Reporte no encontrado');

    return {
      id: report.id,
      fileName: report.fileName.split('/').pop(),
      publicUrl: report.publicUrl,
      employee: `${report.evaluation.employee.firstName} ${report.evaluation.employee.lastName}`,
      area: report.evaluation.employee.area,
      rosaFinal: report.evaluation.rosaFinal,
      riskLevel: report.evaluation.riskLevel,
      generatedBy: `${report.generatedBy.firstName} ${report.generatedBy.lastName}`,
      createdAt: report.createdAt,
    };
  }

  private async renderPdf(html: string): Promise<Buffer> {
  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath:
        process.env.CHROMIUM_PATH ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluateHandle('document.fonts.ready');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    return Buffer.from(pdf);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new InternalServerErrorException(`Error al generar el PDF: ${message}`);
  } finally {
    if (browser) await browser.close();
  }
}

  private getRiskColor(riskLevel: string): string {
    const colors: Record<string, string> = {
      'Inapreciable': '#22C55E',
      'Mejorable': '#F59E0B',
      'Alto': '#F97316',
      'Muy Alto': '#DC2626',
      'Extremo': '#7C2D12',
    };
    return colors[riskLevel] ?? '#6B7280';
  }

  private buildHtml(evaluation: Evaluation, detail: EvaluationDetail | null, company: Company | null): string {
    const riskColor = this.getRiskColor(evaluation.riskLevel);
    const date = new Date(evaluation.createdAt).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const ref = `EVAL-${evaluation.id.substring(0, 8).toUpperCase()}`;

    const recommendations = evaluation.recommendations
      .map((r, i) => `<li style="margin-bottom:6px;color:#374151;">${i + 1}. ${r}</li>`)
      .join('');

    const scoreRow = (label: string, value: number) => `
      <tr>
        <td style="padding:6px 10px;color:#6B7280;font-size:12px;">${label}</td>
        <td style="padding:6px 10px;font-weight:600;color:#111827;font-size:12px;text-align:center;">${value}</td>
      </tr>`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; font-size: 13px; }
    .header { background: #1E3A8A; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header-brand { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .header-sub { font-size: 11px; color: #93C5FD; margin-top: 2px; }
    .header-meta { text-align: right; font-size: 11px; color: #BFDBFE; }
    .divider { height: 4px; background: linear-gradient(to right, #2563EB, #1E3A8A); }
    .content { padding: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #DBEAFE; padding-bottom: 6px; margin-bottom: 14px; margin-top: 20px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; }
    .card-label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-key { font-size: 11px; color: #6B7280; width: 110px; flex-shrink: 0; }
    .info-val { font-size: 11px; color: #111827; font-weight: 500; }
    .result-box { background: #FEF9F9; border: 2px solid ${riskColor}; border-radius: 10px; padding: 20px; text-align: center; }
    .result-score { font-size: 56px; font-weight: 700; color: ${riskColor}; line-height: 1; }
    .result-label { font-size: 13px; font-weight: 600; color: ${riskColor}; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .result-action { font-size: 11px; color: #6B7280; margin-top: 8px; font-style: italic; }
    .scores-table { width: 100%; border-collapse: collapse; }
    .scores-table tr:nth-child(even) { background: #F9FAFB; }
    .scores-table tr:first-child td { background: #EFF6FF; font-weight: 700; color: #1E3A8A; font-size: 12px; padding: 6px 10px; }
    .recs-list { list-style: none; padding: 0; }
    .observations-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px; font-size: 12px; color: #92400E; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #374151; margin-bottom: 6px; }
    .signature-name { font-size: 12px; font-weight: 600; }
    .signature-role { font-size: 10px; color: #6B7280; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #fff; background: ${riskColor}; }
  </style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-brand">SIDEO</div>
    <div class="header-sub">Sistema de Diagnóstico Ergonómico Ocupacional</div>
    <div class="header-sub" style="margin-top:4px;">Evaluación Ergonómica — Método ROSA</div>
  </div>
  <div class="header-meta">
    <div>Fecha: ${date}</div>
    <div style="margin-top:4px;">Ref: ${ref}</div>
    ${company?.logoUrl ? `<img src="${company.logoUrl}" style="height:36px;margin-top:8px;border-radius:4px;"/>` : ''}
  </div>
</div>
<div class="divider"></div>

<div class="content">

  <h2 style="font-size:15px;font-weight:700;color:#111827;margin:16px 0 20px;">REPORTE DE EVALUACIÓN ERGONÓMICA</h2>

  <div class="grid-2">
    <div class="card">
      <div class="card-label">Información del Empleado</div>
      <div class="info-row"><span class="info-key">Nombre:</span><span class="info-val">${evaluation.employee.firstName} ${evaluation.employee.lastName}</span></div>
      <div class="info-row"><span class="info-key">Área:</span><span class="info-val">${evaluation.employee.area ?? '—'}</span></div>
      <div class="info-row"><span class="info-key">Cargo:</span><span class="info-val">${evaluation.employee.position ?? '—'}</span></div>
      <div class="info-row"><span class="info-key">Documento:</span><span class="info-val">${evaluation.employee.documentType ?? ''} ${evaluation.employee.documentNumber ?? '—'}</span></div>
    </div>
    <div class="card">
      <div class="card-label">Información de la Empresa</div>
      <div class="info-row"><span class="info-key">Empresa:</span><span class="info-val">${company?.name ?? '—'}</span></div>
      <div class="info-row"><span class="info-key">NIT:</span><span class="info-val">${company?.nit ?? '—'}</span></div>
      <div class="info-row"><span class="info-key">Evaluador:</span><span class="info-val">${evaluation.evaluator.firstName} ${evaluation.evaluator.lastName}</span></div>
      <div class="info-row"><span class="info-key">Cargo eval.:</span><span class="info-val">${evaluation.evaluator.position ?? 'Evaluador SST'}</span></div>
    </div>
  </div>

  <div class="section-title">Resultado de la Evaluación</div>
  <div class="grid-2">
    <div class="result-box">
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;font-weight:600;margin-bottom:8px;">Puntaje Total ROSA</div>
      <div class="result-score">${evaluation.rosaFinal}</div>
      <div class="result-label">${evaluation.riskLevel}</div>
      <div class="result-action">${evaluation.actionRequired}</div>
    </div>
    <div>
      <table class="scores-table">
        <tr><td>Componente</td><td style="text-align:center;">Puntaje</td></tr>
        ${scoreRow('Altura Asiento', detail?.seatHeight ?? 0)}
        ${scoreRow('Profundidad Asiento', detail?.seatDepth ?? 0)}
        ${scoreRow('Reposabrazos', detail?.armrests ?? 0)}
        ${scoreRow('Respaldo', detail?.backrest ?? 0)}
        ${scoreRow('Puntuación Silla', detail?.chairTotal ?? evaluation.chairScore)}
        ${scoreRow('Pantalla + Tiempo', detail?.screenWithTime ?? 0)}
        ${scoreRow('Teléfono + Tiempo', detail?.phoneWithTime ?? 0)}
        ${scoreRow('Mouse + Tiempo', detail?.mouseWithTime ?? 0)}
        ${scoreRow('Teclado + Tiempo', detail?.keyboardWithTime ?? 0)}
        ${scoreRow('Pantalla y Periféricos', evaluation.screenPeripheralScore)}
      </table>
    </div>
  </div>

  ${evaluation.observations ? `
  <div class="section-title">Observaciones</div>
  <div class="observations-box">${evaluation.observations}</div>
  ` : ''}

  <div class="section-title">Recomendaciones</div>
  <ul class="recs-list">${recommendations}</ul>

  <div class="footer">
    <div class="signature-box">
      <div style="height:40px;"></div>
      <div class="signature-line"></div>
      <div class="signature-name">${evaluation.evaluator.firstName} ${evaluation.evaluator.lastName}</div>
      <div class="signature-role">${evaluation.evaluator.position ?? 'Evaluador SST'}</div>
    </div>
    <div style="text-align:center;">
      <div class="badge">${evaluation.riskLevel}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:8px;">© ${new Date().getFullYear()} SIDEO — Todos los derechos reservados</div>
    </div>
    <div class="signature-box">
      <div style="height:40px;"></div>
      <div class="signature-line"></div>
      <div class="signature-name">${company?.name ?? 'Empresa'}</div>
      <div class="signature-role">Representante SST</div>
    </div>
  </div>

</div>
</body>
</html>`;
  }
}