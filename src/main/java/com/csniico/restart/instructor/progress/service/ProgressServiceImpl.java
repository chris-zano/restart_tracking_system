package com.csniico.restart.instructor.progress.service;

import com.csniico.restart.admin.entity.WeeklyTarget;
import com.csniico.restart.admin.repository.WeeklyTargetRepository;
import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.cohort.entity.Cohort;
import com.csniico.restart.instructor.cohort.repository.CohortRepository;
import com.csniico.restart.instructor.learner.entity.Learner;
import com.csniico.restart.instructor.learner.repository.LearnerRepository;
import com.csniico.restart.instructor.progress.dto.ProgressReportResponseDto;
import com.csniico.restart.instructor.progress.dto.ProgressUploadRequestDto;
import com.csniico.restart.instructor.progress.entity.GradebookReport;
import com.csniico.restart.instructor.progress.repository.GradebookReportRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProgressServiceImpl implements ProgressService {

    private static final ObjectMapper MAPPER =
            new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final CohortRepository cohortRepository;
    private final LearnerRepository learnerRepository;
    private final WeeklyTargetRepository weeklyTargetRepository;
    private final GradebookReportRepository reportRepository;

    public ProgressServiceImpl(CohortRepository cohortRepository,
                                LearnerRepository learnerRepository,
                                WeeklyTargetRepository weeklyTargetRepository,
                                GradebookReportRepository reportRepository) {
        this.cohortRepository = cohortRepository;
        this.learnerRepository = learnerRepository;
        this.weeklyTargetRepository = weeklyTargetRepository;
        this.reportRepository = reportRepository;
    }

    @Override
    public ProgressReportResponseDto generateReport(ProgressUploadRequestDto request) {
        Cohort cohort = cohortRepository.findById(request.getCohortId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cohort not found: " + request.getCohortId()));

        // Get weekly targets for the cohort's track, sorted by enum ordinal
        List<WeeklyTarget> weeklyTargets = Collections.emptyList();
        if (cohort.getTrackId() != null) {
            weeklyTargets = weeklyTargetRepository.findByTrackId(cohort.getTrackId())
                    .stream()
                    .sorted(Comparator.comparingInt(t -> t.getWeekNumber().ordinal()))
                    .collect(Collectors.toList());
        }

        List<Learner> cohortLearners = learnerRepository.findAllByCohortId(request.getCohortId());

        ProgressReportResponseDto report = new ProgressReportResponseDto();
        report.setCohortId(cohort.getId());
        report.setCohortName(cohort.getName());

        List<ProgressReportResponseDto.LearnerProgressDto> learnerProgressList = new ArrayList<>();

        for (ProgressUploadRequestDto.StudentGradebookEntry entry : request.getStudents()) {
            ProgressReportResponseDto.LearnerProgressDto lp = new ProgressReportResponseDto.LearnerProgressDto();
            lp.setGradebookName(entry.getStudentName());

            Optional<Learner> matched = matchLearner(entry.getStudentName(), entry.getEmail(), cohortLearners);
            if (matched.isPresent()) {
                lp.setMatched(true);
                lp.setLearnerId(matched.get().getId());
                lp.setLearnerDbName(matched.get().getFullname());
            } else {
                lp.setMatched(false);
            }

            List<ProgressReportResponseDto.WeekProgressDto> weeks = new ArrayList<>();
            for (WeeklyTarget target : weeklyTargets) {
                ProgressReportResponseDto.WeekProgressDto week = new ProgressReportResponseDto.WeekProgressDto();
                week.setWeekNumber(target.getWeekNumber().name());

                List<ProgressReportResponseDto.ItemProgressDto> labDtos = new ArrayList<>();
                int labsCompleted = 0;
                for (String lab : target.getLabs()) {
                    ProgressReportResponseDto.ItemProgressDto item =
                            buildItemProgress(lab, entry.getScores());
                    labDtos.add(item);
                    if (item.isCompleted()) labsCompleted++;
                }
                week.setLabs(labDtos);
                week.setLabsCompleted(labsCompleted);
                week.setLabsTotal(labDtos.size());

                List<ProgressReportResponseDto.ItemProgressDto> kcDtos = new ArrayList<>();
                int kcCompleted = 0;
                for (String kc : target.getKnowledgeChecks()) {
                    ProgressReportResponseDto.ItemProgressDto item =
                            buildItemProgress(kc, entry.getScores());
                    kcDtos.add(item);
                    if (item.isCompleted()) kcCompleted++;
                }
                week.setKnowledgeChecks(kcDtos);
                week.setKcCompleted(kcCompleted);
                week.setKcTotal(kcDtos.size());

                weeks.add(week);
            }
            lp.setWeeks(weeks);
            learnerProgressList.add(lp);
        }

        report.setLearners(learnerProgressList);

        Instant now = Instant.now();
        report.setUploadedAt(now.toString());
        try {
            String json = MAPPER.writeValueAsString(report);
            GradebookReport saved = reportRepository.findById(cohort.getId())
                    .orElse(new GradebookReport(cohort.getId(), json, now));
            saved.setReportJson(json);
            saved.setUploadedAt(now);
            reportRepository.save(saved);
        } catch (Exception e) {
            System.err.println("[PROGRESS] Failed to persist report: " + e.getMessage());
        }

        return report;
    }

    @Override
    public void deleteReport(Long cohortId) {
        if (!reportRepository.existsById(cohortId)) {
            throw new ResourceNotFoundException("No saved report for cohort: " + cohortId);
        }
        reportRepository.deleteById(cohortId);
    }

    @Override
    public ProgressReportResponseDto getSavedReport(Long cohortId) {
        GradebookReport saved = reportRepository.findById(cohortId)
                .orElseThrow(() -> new ResourceNotFoundException("No saved report for cohort: " + cohortId));
        try {
            ProgressReportResponseDto dto = MAPPER.readValue(saved.getReportJson(), ProgressReportResponseDto.class);
            dto.setUploadedAt(saved.getUploadedAt().toString());
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize saved report for cohort " + cohortId, e);
        }
    }

    // ── Matching helpers ──────────────────────────────────────────────────

    private Optional<Learner> matchLearner(String gradebookName, String email, List<Learner> learners) {
        // 1. Strict email match — try the SIS Login ID column first, then the Student field
        //    if it looks like an email address.
        String[] emailCandidates = buildEmailCandidates(gradebookName, email);
        for (String candidate : emailCandidates) {
            if (candidate == null || candidate.isBlank()) continue;
            String normCandidate = candidate.toLowerCase().trim();
            for (Learner l : learners) {
                if (normCandidate.equals(l.getEmail().toLowerCase().trim())) {
                    System.out.printf("[MATCH:EMAIL] '%s' → %s (db email: %s)%n",
                            candidate, l.getFullname(), l.getEmail());
                    return Optional.of(l);
                }
            }
        }

        // 2. If the Student field itself is an email but didn't match any learner, stop here —
        //    falling through to name matching on an email string produces nonsense scores.
        if (gradebookName != null && gradebookName.contains("@")) {
            System.out.printf("[NOMATCH:EMAIL] No email match for student field '%s'%n", gradebookName);
            return Optional.empty();
        }

        // 3. Fuzzy name match (70 % similarity threshold).
        //    Also try comma-reversed form ("Mensah, Kofi" → "Kofi Mensah").
        String normName     = normalize(gradebookName);
        String normReversed = reverseCommaName(normName);

        double bestSim = 0;
        Learner bestMatch = null;
        for (Learner l : learners) {
            String dbNorm = normalize(l.getFullname());
            double sim = Math.max(similarity(normName, dbNorm), similarity(normReversed, dbNorm));
            if (sim > bestSim) { bestSim = sim; bestMatch = l; }
        }

        if (bestSim >= 0.70 && bestMatch != null) {
            System.out.printf("[MATCH:NAME] '%s' → %s (sim=%.2f)%n",
                    gradebookName, bestMatch.getFullname(), bestSim);
            return Optional.of(bestMatch);
        }

        System.out.printf("[NOMATCH] '%s' — best name sim=%.2f (%s)%n",
                gradebookName,
                bestSim,
                bestMatch != null ? bestMatch.getFullname() : "none");
        return Optional.empty();
    }

    /** Returns the email candidates to try, in priority order. */
    private String[] buildEmailCandidates(String studentField, String sisEmail) {
        // SIS Login ID is most reliable; Student field is a fallback when it's an email
        boolean studentIsEmail = studentField != null && studentField.contains("@");
        return studentIsEmail
                ? new String[]{sisEmail, studentField}
                : new String[]{sisEmail};
    }

    private ProgressReportResponseDto.ItemProgressDto buildItemProgress(
            String title, Map<String, String> scores) {
        ProgressReportResponseDto.ItemProgressDto item = new ProgressReportResponseDto.ItemProgressDto();
        item.setTitle(title);

        String normTitle = normalize(title);
        boolean found = false;
        String foundScore = null;

        if (scores != null) {
            double bestSim = 0;
            String bestColKey = null;
            for (Map.Entry<String, String> e : scores.entrySet()) {
                double sim = similarity(normTitle, normalize(e.getKey()));
                if (sim > bestSim) {
                    bestSim = sim;
                    bestColKey = e.getKey();
                    foundScore = e.getValue();
                }
            }
            if (bestSim >= 0.7) {
                found = true;
                System.out.printf("  [ITEM:MATCH] '%s'  →  '%s'  (sim=%.2f, score=%s)%n",
                        normTitle, bestColKey, bestSim, foundScore);
            } else {
                System.out.printf("  [ITEM:MISS]  '%s'  (best=%.2f via '%s')%n",
                        normTitle, bestSim, bestColKey != null ? bestColKey : "—");
                foundScore = null;
            }
        }

        item.setFoundInGradebook(found);
        item.setScore(foundScore);
        item.setCompleted(isCompleted(foundScore));
        return item;
    }

    private boolean isCompleted(String score) {
        if (score == null || score.isBlank() || score.equalsIgnoreCase("N/A")) return false;
        try {
            return Double.parseDouble(score.trim()) > 0;
        } catch (NumberFormatException e) {
            return true;
        }
    }

    private String normalize(String s) {
        if (s == null) return "";
        return s.toLowerCase()
                .replaceAll("\\(\\d+\\)", "")  // strip Canvas IDs like "(617623)"
                .replaceAll("[^a-z0-9 ]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /** Levenshtein-based similarity in [0, 1]. */
    private double similarity(String a, String b) {
        if (a.equals(b)) return 1.0;
        int maxLen = Math.max(a.length(), b.length());
        if (maxLen == 0) return 1.0;
        return 1.0 - (double) levenshtein(a, b) / maxLen;
    }

    private int levenshtein(String a, String b) {
        int m = a.length(), n = b.length();
        int[] prev = new int[n + 1], curr = new int[n + 1];
        for (int j = 0; j <= n; j++) prev[j] = j;
        for (int i = 1; i <= m; i++) {
            curr[0] = i;
            for (int j = 1; j <= n; j++) {
                curr[j] = a.charAt(i - 1) == b.charAt(j - 1)
                        ? prev[j - 1]
                        : 1 + Math.min(prev[j - 1], Math.min(prev[j], curr[j - 1]));
            }
            int[] tmp = prev; prev = curr; curr = tmp;
        }
        return prev[n];
    }

    /** "mensah, kofi" → "kofi mensah" */
    private String reverseCommaName(String name) {
        if (name.contains(",")) {
            String[] parts = name.split(",", 2);
            return parts[1].trim() + " " + parts[0].trim();
        }
        return name;
    }
}

