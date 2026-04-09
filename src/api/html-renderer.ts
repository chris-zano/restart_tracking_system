/**
 * HTML Rendering for API responses
 */

import type { Student } from "../types/common.types";
import type { TargetComparisonReport } from "../types/weekly-targets.types";
import type { AttendanceReport } from "../types/attendance.types";

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown Date" : date.toLocaleDateString();
}

/**
 * Render HTML page with header and footer
 */
function renderPage(
  title: string,
  content: string,
  role: "admin" | "guest" = "guest",
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; margin: 1rem 2rem; color: #222; }
    nav a { margin-right: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
    details { border: 1px solid #ddd; border-radius: 3.5px; margin: 4px 0; padding: 4px 8px; }
    details[open] { background: #fafafa; }
    summary { cursor: pointer; padding: 4px 0; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: "▶ "; font-size: 0.75em; }
    details[open] summary::before { content: "▼ "; }
    .search-box {
      display: flex; align-items: center; gap: 8px;
      margin: 10px 0 14px;
    }
    .search-box input {
      padding: 6px 12px; font-size: 1rem;
      border: 1px solid #aaa; border-radius: 3.5px;
      width: 320px; outline: none;
    }
    .search-box input:focus { border-color: #555; box-shadow: 0 0 0 2px #ddd; }
    .search-count { font-size: 0.85rem; color: #666; }
    tr.hidden { display: none; }
    details.hidden { display: none; }
  </style>
  <script>
    function searchTable(inputId, tableId, countId) {
      const q = document.getElementById(inputId).value.toLowerCase();
      const rows = document.querySelectorAll('#' + tableId + ' tbody tr');
      let visible = 0;
      rows.forEach(row => {
        const match = row.textContent.toLowerCase().includes(q);
        row.classList.toggle('hidden', !match);
        if (match) visible++;
      });
      const el = document.getElementById(countId);
      if (el) el.textContent = visible + ' shown';
    }

    function searchDetails(inputId, containerId, countId) {
      const q = document.getElementById(inputId).value.toLowerCase();
      const items = document.querySelectorAll('#' + containerId + ' > details');
      let visible = 0;
      items.forEach(item => {
        const match = (item.dataset.name || item.textContent).toLowerCase().includes(q);
        item.classList.toggle('hidden', !match);
        if (match) visible++;
      });
      const el = document.getElementById(countId);
      if (el) el.textContent = visible + ' shown';
    }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <nav>
    <a href="/">Home</a>${role === "admin" ? " | <a href='/students'>Students</a>" : ""} |
    <a href="/analysis">KCs &amp; Lab Progress</a> |
    <a href="/attendance">Attendance</a> |
    ${
      role === "admin"
        ? "<a href='/logout' style='color:#c0392b'>Logout</a>"
        : "<a href='/logout' style='color:#888'>Exit Guest Mode</a>"
    }
  </nav>
  <hr>
  ${content}
  <hr>
  <footer>
    <p>Canvas Gradebook Analysis API - ${new Date().toLocaleString()}</p>
  </footer>
</body>
</html>`;
}

/**
 * Render home page
 */
export function renderHome(role: "admin" | "guest" = "guest"): string {
  const adminLinks =
    role === "admin"
      ? `<li><a href="/health">Health Check (JSON)</a></li>
      <li><a href="/students">Students List (HTML)</a></li>
      <li><a href="/api/students">Students (JSON)</a></li>
      <li><a href="/api/analysis">KCs &amp; Lab Progress (JSON)</a></li>
      <li><a href="/api/attendance">Attendance (JSON)</a></li>`
      : "";
  const content = `
    <h2>Available Resources</h2>
    <ul>
      ${adminLinks}
      <li><a href="/analysis">KCs &amp; Lab Progress (HTML)</a></li>
      <li><a href="/attendance">Attendance Report (HTML)</a></li>
    </ul>
  `;
  return renderPage("Grading Portal", content, role);
}

/**
 * Render students list as HTML table
 */
export function renderStudents(
  students: Student[],
  role: "admin" | "guest" = "admin",
): string {
  const rows = students
    .map(
      (s) => `
    <tr>
      <td>${s.fullName}</td>
      <td>${s.email}</td>
      <td>${s.normalizedName || "N/A"}</td>
    </tr>`,
    )
    .join("");

  const content = `
    <h2>Students (${students.length})</h2>
    <div class="search-box">
      <input id="students-search" type="search" placeholder="Search by name or email…"
        oninput="searchTable('students-search','students-table','students-count')">
      <span class="search-count" id="students-count">${students.length} shown</span>
    </div>
    <table id="students-table" border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Full Name</th>
          <th>Email</th>
          <th>Normalized Name</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  return renderPage("Students List", content, role);
}

/**
 * Render analysis report as HTML with tables and accordions
 */
export function renderAnalysis(
  report: TargetComparisonReport,
  currentWeek: number,
  role: "admin" | "guest" = "guest",
): string {
  const stats = report.classStats;

  // Class-wide statistics
  const statsTable = `
    <h2>Class-Wide Statistics</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Total Learners</td>
        <td>${stats.totalLearners}</td>
      </tr>
      <tr>
        <td>Average KC Completion</td>
        <td>${stats.averageKCCompletion.toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Average Lab Completion</td>
        <td>${stats.averageLabCompletion.toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Average Overall Completion</td>
        <td>${stats.averageOverallCompletion.toFixed(1)}%</td>
      </tr>
    </table>
  `;

  // Distribution
  const distTable = `
    <h3>Distribution</h3>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Category</th>
        <th>Count</th>
        <th>Percentage</th>
      </tr>
      <tr>
        <td>Ahead (≥90%)</td>
        <td>${stats.learnersAhead}</td>
        <td>${((stats.learnersAhead / stats.totalLearners) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>On Track (70-89%)</td>
        <td>${stats.learnersOnTrack}</td>
        <td>${((stats.learnersOnTrack / stats.totalLearners) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Behind (50-69%)</td>
        <td>${stats.learnersBehind}</td>
        <td>${((stats.learnersBehind / stats.totalLearners) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>At Risk (&lt;50%)</td>
        <td>${stats.learnersAtRisk}</td>
        <td>${((stats.learnersAtRisk / stats.totalLearners) * 100).toFixed(1)}%</td>
      </tr>
    </table>
  `;

  // Individual learner progress (accordion)
  const learnerRows = report.learnerProgress
    .sort(
      (a, b) =>
        b.cumulative.overall.percentage - a.cumulative.overall.percentage,
    )
    .map((learner) => {
      const nameAttr = `data-name="${(learner.learnerName + " " + learner.learnerEmail).toLowerCase()}"`;
      const weeklyDetails = learner.weeklyProgress
        .map(
          (week) => `
        <tr>
          <td>Week ${week.week}</td>
          <td>${week.kcs.completed.length}/${week.kcs.expected.length}</td>
          <td>${week.labs.completed.length}/${week.labs.expected.length}</td>
          <td>${week.overallCompletion.toFixed(1)}%</td>
        </tr>`,
        )
        .join("");

      // Build incomplete items section grouped by week
      let incompleteSection = "";
      const hasIncomplete =
        learner.missingKCs.length > 0 || learner.missingLabs.length > 0;

      if (hasIncomplete) {
        const incompleteByWeek = learner.weeklyProgress
          .filter(
            (week) =>
              week.kcs.missing.length > 0 || week.labs.missing.length > 0,
          )
          .map((week) => {
            const missingKCs =
              week.kcs.missing.length > 0
                ? `<li><strong>KCs (${week.kcs.missing.length}):</strong>
                   <ul>${week.kcs.missing.map((kc) => `<li>${kc.name}</li>`).join("")}</ul>
                 </li>`
                : "";

            const missingLabs =
              week.labs.missing.length > 0
                ? `<li><strong>Labs (${week.labs.missing.length}):</strong>
                   <ul>${week.labs.missing.map((lab) => `<li>${lab.name}</li>`).join("")}</ul>
                 </li>`
                : "";

            return `
              <li><strong>Week ${week.week}:</strong>
                <ul style="margin-left: 0; padding-left: 20px;">
                  ${missingKCs}
                  ${missingLabs}
                </ul>
              </li>`;
          })
          .join("");

        incompleteSection = `
          <h4 style="margin-top: 15px;">Incomplete Items</h4>
          <ul style="margin-left: 0; padding-left: 20px;">
            ${incompleteByWeek}
          </ul>`;
      }

      return `
      <details ${nameAttr}>
        <summary>
          <strong>${learner.learnerName}</strong> - 
          ${learner.cumulative.overall.percentage.toFixed(1)}% 
          (KCs: ${learner.cumulative.kcs.completed}/${learner.cumulative.kcs.total}, 
          Labs: ${learner.cumulative.labs.completed}/${learner.cumulative.labs.total})
        </summary>
        <div style="margin-left: 20px;">
          <p><strong>Email:</strong> ${learner.learnerEmail}</p>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr>
                <th>Week</th>
                <th>KCs</th>
                <th>Labs</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyDetails}
            </tbody>
          </table>
          ${incompleteSection}
        </div>
      </details>`;
    })
    .join("");

  const learnersSection = `
    <h2>Individual Learner Progress</h2>
    <div class="search-box">
      <input id="analysis-search" type="search" placeholder="Search by name or email…"
        oninput="searchDetails('analysis-search','analysis-learners','analysis-count')">
      <span class="search-count" id="analysis-count">${report.learnerProgress.length} shown</span>
    </div>
    <div id="analysis-learners">${learnerRows}</div>
  `;

  const content = `
    <h2>KCs &amp; Lab Progress - Week ${currentWeek}</h2>
    <p><strong>Report Date:</strong> ${report.reportDate.toLocaleString()}</p>
    ${role === "admin" ? statsTable + distTable : ""}
    ${learnersSection}
  `;

  return renderPage("KCs & Lab Progress", content, role);
}

/**
 * Render attendance report as HTML with tables and accordions
 */
function sessionStatus(
  pct: number,
  attended: boolean,
  passThreshold: number,
): { label: string; color: string } {
  if (!attended || pct === 0) return { label: "Absent", color: "#c0392b" };
  if (pct >= passThreshold) return { label: "Attended", color: "#27ae60" };
  if (pct >= 60) return { label: "Partial", color: "#e67e22" };
  return { label: "At Risk", color: "#c0392b" };
}

function overallStatus(
  timeRate: number,
  passThreshold: number,
): { label: string; color: string } {
  if (timeRate >= passThreshold) return { label: "Passing", color: "#27ae60" };
  if (timeRate >= 60) return { label: "Borderline", color: "#e67e22" };
  return { label: "At Risk", color: "#c0392b" };
}

export function renderAttendance(
  report: AttendanceReport,
  attendanceThreshold: number = 80,
  role: "admin" | "guest" = "guest",
): string {
  // Overall statistics
  const statsTable = `
    <h2>Overall Statistics</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <td><strong>Total Sessions</strong></td>
        <td>${report.stats.totalSessions}</td>
      </tr>
      <tr>
        <td><strong>Total Minutes</strong></td>
        <td>${report.stats.totalMinutes}</td>
      </tr>
      <tr>
        <td><strong>Average Session Duration</strong></td>
        <td>${report.stats.averageSessionDuration.toFixed(0)} minutes</td>
      </tr>
      <tr>
        <td><strong>Average Attendance Rate</strong></td>
        <td>${report.stats.averageAttendanceRate.toFixed(1)}%</td>
      </tr>
    </table>
  `;

  // Distribution table
  const distTable = `
    <h2>Attendance Distribution</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Category</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Perfect (100%)</td>
          <td>${report.stats.perfectAttendance}</td>
          <td>${((report.stats.perfectAttendance / report.learnerAttendance.length) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Good (80-99%)</td>
          <td>${report.stats.goodAttendance}</td>
          <td>${((report.stats.goodAttendance / report.learnerAttendance.length) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Fair (60-79%)</td>
          <td>${report.stats.fairAttendance}</td>
          <td>${((report.stats.fairAttendance / report.learnerAttendance.length) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Poor (&lt;60%)</td>
          <td>${report.stats.poorAttendance}</td>
          <td>${((report.stats.poorAttendance / report.learnerAttendance.length) * 100).toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>
  `;

  // Sessions list
  const sessionsTable = `
    <h2>Sessions (${report.sessions.length})</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Date</th>
          <th>Topic</th>
          <th>Duration</th>
          <th>Attendees</th>
          <th>Attendance Rate</th>
        </tr>
      </thead>
      <tbody>
        ${report.sessions
          .map((session) => {
            const date = formatDate(session.metadata.startTime);
            return `
              <tr>
                <td>${date}</td>
                <td>${session.metadata.topic}</td>
                <td>${session.metadata.duration} min</td>
                <td>${session.stats.totalAttendees}</td>
                <td>${session.stats.attendanceRate.toFixed(1)}%</td>
              </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  `;

  // Individual learner attendance (sorted by attendance rate)
  const sortedLearners = [...report.learnerAttendance].sort(
    (a, b) => b.summary.attendanceRate - a.summary.attendanceRate,
  );

  const learnerRows = sortedLearners
    .map((learner) => {
      const nameAttr = `data-name="${(learner.student.fullName + " " + learner.student.email).toLowerCase()}"`;
      const sessionRows = learner.sessions
        .map((s) => {
          const date = formatDate(s.session.startTime);
          const { label, color } = sessionStatus(
            s.attendancePercentage,
            s.attended,
            attendanceThreshold,
          );
          return `
            <tr>
              <td>${date}</td>
              <td><span style="color:${color};font-weight:600">${label}</span></td>
              <td>${s.durationMinutes} / ${s.session.duration} min</td>
              <td>${s.attendancePercentage.toFixed(0)}%</td>
            </tr>`;
        })
        .join("");

      const { label: overallLabel, color: overallColor } = overallStatus(
        learner.summary.timeAttendanceRate,
        attendanceThreshold,
      );

      return `
      <details ${nameAttr}>
        <summary>
          <strong>${learner.student.fullName}</strong>
          <span style="color:${overallColor};font-weight:600;margin-left:8px">${overallLabel}</span>
          &nbsp;·&nbsp;${learner.summary.timeAttendanceRate.toFixed(1)}% time
          &nbsp;·&nbsp;${learner.summary.sessionsAttended}/${learner.summary.totalSessions} sessions
        </summary>
        <div>
          <p><strong>Email:</strong> ${learner.student.email}</p>
          <p><strong>Total Minutes:</strong> ${learner.summary.totalMinutesAttended} / ${learner.summary.totalMinutesPossible}</p>
          <p><strong>Time Attendance:</strong> ${learner.summary.timeAttendanceRate.toFixed(1)}%</p>
          <p><strong>Average Duration:</strong> ${learner.summary.averageDurationPerSession.toFixed(0)} minutes</p>
          
          <h3>Session Details</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Duration</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${sessionRows}
            </tbody>
          </table>
        </div>
      </details>`;
    })
    .join("");

  const learnersSection = `
    <h2>Individual Learner Attendance</h2>
    <div class="search-box">
      <input id="attendance-search" type="search" placeholder="Search by name or email…"
        oninput="searchDetails('attendance-search','attendance-learners','attendance-count')">
      <span class="search-count" id="attendance-count">${sortedLearners.length} shown</span>
    </div>
    <div id="attendance-learners">${learnerRows}</div>
  `;

  // Unmatched attendees warning
  let unmatchedSection = "";
  if (report.unmatchedAttendees.length > 0) {
    unmatchedSection = `
      <h2>⚠️ Unmatched Attendees (${report.unmatchedAttendees.length})</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <thead>
          <tr>
            <th>Session</th>
            <th>Name</th>
            <th>Email</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${report.unmatchedAttendees
            .map(
              (u) => `
            <tr>
              <td>${u.session}</td>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td>${u.reason}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  const content = `
    <h2>Attendance Report</h2>
    <p><strong>Date Range:</strong> ${formatDate(report.dateRange.start)} - ${formatDate(report.dateRange.end)}</p>
    <p><strong>Total Learners:</strong> ${report.learnerAttendance.length}</p>
    ${role === "admin" ? statsTable + distTable + sessionsTable : ""}
    ${learnersSection}
    ${role === "admin" ? unmatchedSection : ""}
  `;

  return renderPage("Attendance Report", content, role);
}
