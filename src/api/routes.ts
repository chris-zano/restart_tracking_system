/**
 * API Route Handlers
 */

import { ingestAllData } from "../orchestrator/data-loader";
import { analyzeTargetCompletion } from "../analysis/target-analyzer";
import {
  renderHome,
  renderStudents,
  renderAnalysis,
  renderAttendance,
} from "./html-renderer";
import { getRole } from "../auth/session";

/**
 * Health check endpoint
 */
export function healthHandler(): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Canvas Gradebook Analysis API",
  });
}

/**
 * Get all students
 */
export async function studentsHandler(): Promise<Response> {
  const dataResult = await ingestAllData({
    loadTargets: false,
    loadAttendance: false,
    loadProgress: false,
    skipValidation: true,
  });

  if (!dataResult.success || !dataResult.data) {
    return Response.json({ error: dataResult.error }, { status: 500 });
  }

  const students = dataResult.data.students.map((s) => ({
    fullName: s.fullName,
    email: s.email,
  }));

  return Response.json({
    count: students.length,
    students,
  });
}

/**
 * Get analysis results
 */
export async function analysisHandler(): Promise<Response> {
  const dataResult = await ingestAllData();

  if (!dataResult.success || !dataResult.data) {
    return Response.json({ error: dataResult.error }, { status: 500 });
  }

  const data = dataResult.data;
  const report = analyzeTargetCompletion(data);

  return Response.json({
    timestamp: new Date().toISOString(),
    currentWeek: data.currentWeek,
    classStats: report.classStats,
    learnerCount: report.learnerProgress.length,
  });
}

/**
 * Home page (HTML)
 */
export function homeHandler(req: Request): Response {
  const role = getRole(req) ?? "guest";
  return new Response(renderHome(role), {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Get all students (HTML)
 */
export async function studentsHtmlHandler(req: Request): Promise<Response> {
  const role = getRole(req) ?? "guest";
  const dataResult = await ingestAllData({
    loadTargets: false,
    loadAttendance: false,
    loadProgress: false,
    skipValidation: true,
  });

  if (!dataResult.success || !dataResult.data) {
    return new Response(`<h1>Error</h1><p>${dataResult.error}</p>`, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }

  return new Response(renderStudents(dataResult.data.students, role), {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Get analysis results (HTML)
 */
export async function analysisHtmlHandler(req: Request): Promise<Response> {
  const role = getRole(req) ?? "guest";
  const dataResult = await ingestAllData();

  if (!dataResult.success || !dataResult.data) {
    return new Response(`<h1>Error</h1><p>${dataResult.error}</p>`, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }

  const data = dataResult.data;
  const report = analyzeTargetCompletion(data);

  return new Response(renderAnalysis(report, data.currentWeek, role), {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Get attendance results (JSON)
 */
export async function attendanceHandler(): Promise<Response> {
  const dataResult = await ingestAllData({
    loadTargets: false,
    loadProgress: false,
  });

  if (!dataResult.success || !dataResult.data) {
    return Response.json({ error: dataResult.error }, { status: 500 });
  }

  const attendance = dataResult.data.attendance;

  return Response.json({
    timestamp: new Date().toISOString(),
    totalSessions: attendance.stats.totalSessions,
    totalLearners: attendance.learnerAttendance.length,
    stats: attendance.stats,
    dateRange: attendance.dateRange,
    unmatchedCount: attendance.unmatchedAttendees.length,
  });
}

/**
 * Get attendance results (HTML)
 */
export async function attendanceHtmlHandler(req: Request): Promise<Response> {
  const role = getRole(req) ?? "guest";
  const dataResult = await ingestAllData({
    loadTargets: false,
    loadProgress: false,
  });

  if (!dataResult.success || !dataResult.data) {
    return new Response(`<h1>Error</h1><p>${dataResult.error}</p>`, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }

  const attendance = dataResult.data.attendance;
  const attendanceThreshold = dataResult.data.attendanceThreshold;

  return new Response(renderAttendance(attendance, attendanceThreshold, role), {
    headers: { "Content-Type": "text/html" },
  });
}
