import { Report, Case, Alert, InsertReport } from "@shared/schema";
import { storage } from "../storage";
import { generateId } from "../../client/src/lib/utils";

/**
 * Generates a regulatory report based on case investigation
 * 
 * @param caseId The case to generate a report for
 * @param reportType Type of report (SAR, CTR, etc.)
 * @param userId ID of the user generating the report
 * @returns The generated report
 */
export async function generateReport(
  caseId: string,
  reportType: string,
  userId: string
): Promise<Report> {
  // Retrieve the case
  const caseData = await storage.getCase(caseId);
  
  if (!caseData) {
    throw new Error(`Case not found: ${caseId}`);
  }
  
  // Get alerts associated with the case
  const alerts: Alert[] = [];
  for (const alertId of caseData.alertIds) {
    const alert = await storage.getAlert(alertId);
    if (alert) {
      alerts.push(alert);
    }
  }
  
  // Get entities associated with the case
  const entities = [];
  for (const entityId of caseData.entityIds) {
    const entity = await storage.getEntity(entityId);
    if (entity) {
      entities.push(entity);
    }
  }
  
  // Generate report title based on type
  let title = "";
  switch (reportType) {
    case "sar":
      title = `Suspicious Activity Report: ${caseData.title}`;
      break;
    case "ctr":
      title = `Currency Transaction Report: ${caseData.title}`;
      break;
    case "aml":
      title = `AML Compliance Report: ${caseData.title}`;
      break;
    case "kyc":
      title = `KYC Verification Report: ${caseData.title}`;
      break;
    default:
      title = `${reportType.toUpperCase()} Report: ${caseData.title}`;
  }
  
  // Generate report description
  const description = `This report contains findings from the investigation of ${caseData.title}. ` +
    `The investigation involved ${entities.length} entities and ${alerts.length} alerts. ` +
    `Case priority: ${caseData.priority}.`;
  
  // Create report data structure with all relevant information
  const reportData = {
    case: caseData,
    entities,
    alerts,
    summary: caseData.description,
    findings: {
      suspiciousActivities: alerts.length,
      highRiskEntities: entities.filter(e => e.riskLevel === "high" || e.riskLevel === "critical").length,
      totalTransactionValue: 0, // Would be calculated from actual transactions
      jurisdictions: [...new Set(entities.map(e => e.jurisdiction))],
    },
    generatedBy: userId,
    generatedAt: new Date().toISOString()
  };
  
  // Create the report
  const report: InsertReport = {
    caseId,
    type: reportType,
    title,
    description,
    status: "draft",
    createdBy: userId,
    data: reportData
  };
  
  const createdReport = await storage.createReport(report);
  
  // Log report creation
  await storage.createActivity({
    timestamp: new Date().toISOString(),
    userId,
    actionType: "create",
    actionDescription: `Created ${reportType.toUpperCase()} report for case ${caseId}`,
    caseId,
    status: "completed",
    metadata: { reportId: createdReport.id, reportType }
  });
  
  return createdReport;
}

/**
 * Submits a report to the relevant regulatory authority
 * 
 * @param reportId ID of the report to submit
 * @param userId ID of the user submitting the report
 * @returns The updated report
 */
export async function submitReport(reportId: string, userId: string): Promise<Report> {
  // Get the report
  const report = await storage.getReport(reportId);
  
  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }
  
  if (report.status !== "draft") {
    throw new Error(`Report ${reportId} is already submitted`);
  }
  
  // In a real system, this would connect to regulatory filing systems
  // For demo purposes, we'll just update the status
  
  const updatedReport = await storage.updateReport(reportId, {
    status: "submitted",
    submittedAt: new Date().toISOString()
  });
  
  if (!updatedReport) {
    throw new Error(`Failed to update report: ${reportId}`);
  }
  
  // Log report submission
  await storage.createActivity({
    timestamp: new Date().toISOString(),
    userId,
    actionType: "submit",
    actionDescription: `Submitted ${report.type.toUpperCase()} report ${reportId} to regulatory authority`,
    caseId: report.caseId,
    status: "completed",
    metadata: { reportId, reportType: report.type }
  });
  
  return updatedReport;
}

/**
 * Gets all reports filtered by various criteria
 */
export async function getFilteredReports(options: {
  reportType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  caseId?: string;
  limit?: number;
}): Promise<Report[]> {
  const allReports = await storage.getAllReports();
  
  return allReports.filter(report => {
    // Filter by report type
    if (options.reportType && options.reportType !== "all" && report.type !== options.reportType) {
      return false;
    }
    
    // Filter by status
    if (options.status && options.status !== "all" && report.status !== options.status) {
      return false;
    }
    
    // Filter by case
    if (options.caseId && report.caseId !== options.caseId) {
      return false;
    }
    
    // Filter by date range
    if (options.startDate && options.endDate) {
      const reportDate = new Date(report.createdAt);
      if (reportDate < options.startDate || reportDate > options.endDate) {
        return false;
      }
    }
    
    return true;
  })
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, options.limit || Infinity);
}
