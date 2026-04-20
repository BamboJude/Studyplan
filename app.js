const dayLabels = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
};

const dayNameToCode = {
  Montag: "MO",
  Dienstag: "TU",
  Mittwoch: "WE",
  Donnerstag: "TH",
  Freitag: "FR",
  Monday: "MO",
  Tuesday: "TU",
  Wednesday: "WE",
  Thursday: "TH",
  Friday: "FR",
};

let semesterPlanText = "";
let currentSearch = "";
let activeTourIndex = 0;

let courses = [];

const sampleTimetableText = `Information Engineering and Computer Sciences Sample

Monday
08:15-11:30
9511 System Simulation
L
Prof. Dr. Zimmer
PC-Pool 2
02 01 520

Monday
12:15-15:30
9532 Mobile and Internet Computing
L
Prof. Dr. Boek
Cloud Resilience Lab
03 02 110

Tuesday
12:15-15:30
9515 Artificial Intelligence and its Application
L
Prof. Dr. Ressel
Seminarraum 6
03 02 135

Wednesday
08:15-11:30
9534 Privacy in Distributed Systems
L
Prof. Dr. Grosse-Kampmann
Cloud Resilience Lab
03 02 110

Thursday
12:15-15:30
9512 Data Analysis & Information Engineering
L
Prof. Dr. Schwind
RAG
06 01 120

Thursday
12:15-15:30
9538 Advanced Software Engineering
L
Prof. Dr. Example
PC-Pool 1
02 01 510`;

const tourSteps = [
  {
    target: () => el.uploadZone,
    title: "Upload the lecture timetable",
    body: "Click here and choose the official lecture timetable PDF. This is the important file because it contains the course times, rooms, and professors.",
  },
  {
    target: () => el.rawText,
    title: "PDF text appears here",
    body: "After upload, extracted text appears here. If a PDF is difficult to read, paste copied timetable text here and click Read Timetable Text.",
  },
  {
    target: () => el.courseList,
    title: "Select your courses",
    body: "The app turns the timetable into course cards. Tick only the courses you want. Clashes are allowed because the final choice is yours.",
  },
  {
    target: () => el.printButton,
    title: "Print or save your PDF",
    body: "When your courses are selected, click Print / Save PDF. The print view is formatted as a clean landscape timetable.",
  },
  {
    target: () => el.icsButton,
    title: "Download your calendar",
    body: "Click Download Calendar to get an .ics file. You can import it into Google Calendar, Apple Calendar, or iPhone Calendar.",
  },
  {
    target: () => el.semesterPlanZone,
    title: "Optional semester plan",
    body: "You can add a semester plan too. It is only used to suggest likely subjects; calendar times still come from the lecture timetable.",
  },
];

const el = {
  sourceFile: document.querySelector("#sourceFile"),
  uploadZone: document.querySelector("label[for='sourceFile']"),
  fileStatus: document.querySelector("#fileStatus"),
  semesterPlanFile: document.querySelector("#semesterPlanFile"),
  semesterPlanZone: document.querySelector("label[for='semesterPlanFile']"),
  semesterPlanStatus: document.querySelector("#semesterPlanStatus"),
  rawText: document.querySelector("#rawText"),
  parseTextButton: document.querySelector("#parseTextButton"),
  sampleButton: document.querySelector("#sampleButton"),
  importSummary: document.querySelector("#importSummary"),
  studentName: document.querySelector("#studentName"),
  programmeName: document.querySelector("#programmeName"),
  semesterStart: document.querySelector("#semesterStart"),
  semesterEnd: document.querySelector("#semesterEnd"),
  manualTitle: document.querySelector("#manualTitle"),
  manualProfessor: document.querySelector("#manualProfessor"),
  manualRoom: document.querySelector("#manualRoom"),
  manualDay: document.querySelector("#manualDay"),
  manualStart: document.querySelector("#manualStart"),
  manualEnd: document.querySelector("#manualEnd"),
  addManualButton: document.querySelector("#addManualButton"),
  courseList: document.querySelector("#courseList"),
  conflictPanel: document.querySelector("#conflictPanel"),
  courseSearch: document.querySelector("#courseSearch"),
  courseStats: document.querySelector("#courseStats"),
  printTitle: document.querySelector("#printTitle"),
  printSubtitle: document.querySelector("#printSubtitle"),
  printDates: document.querySelector("#printDates"),
  calendarGrid: document.querySelector("#calendarGrid"),
  agendaList: document.querySelector("#agendaList"),
  printButton: document.querySelector("#printButton"),
  icsButton: document.querySelector("#icsButton"),
  selectAllButton: document.querySelector("#selectAllButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  tourLauncher: document.querySelector("#tourLauncher"),
  tourOverlay: document.querySelector("#tourOverlay"),
  tourCard: document.querySelector("#tourCard"),
  tourProgress: document.querySelector("#tourProgress"),
  tourTitle: document.querySelector("#tourTitle"),
  tourBody: document.querySelector("#tourBody"),
  tourNextButton: document.querySelector("#tourNextButton"),
  tourBackButton: document.querySelector("#tourBackButton"),
  tourSkipButton: document.querySelector("#tourSkipButton"),
};

function render() {
  renderStats();
  renderCourseList();
  renderConflicts();
  renderTimetable();
  renderHeader();
}

function renderHeader() {
  el.printTitle.textContent = el.studentName.value.trim() || "HSRW Student";
  el.printSubtitle.textContent = el.programmeName.value.trim() || "Semester timetable";
  el.printDates.textContent = `${formatDate(el.semesterStart.value)} - ${formatDate(el.semesterEnd.value)}`;
}

function renderCourseList() {
  el.courseList.innerHTML = "";
  if (!courses.length) {
    el.courseList.innerHTML = `
      <div class="empty-courses">
        Upload a lecture timetable PDF or paste timetable text to generate course choices.
      </div>
    `;
    return;
  }
  const visibleCourses = courses.filter(matchesSearch);
  if (!visibleCourses.length) {
    el.courseList.innerHTML = `
      <div class="empty-courses">
        No courses match this search.
      </div>
    `;
    return;
  }
  visibleCourses.forEach((course) => {
    const card = document.createElement("article");
    const hasConflict = courseHasConflict(course);
    card.className = `course-card ${course.selected ? "selected" : ""} ${hasConflict ? "has-conflict" : ""}`;
    card.innerHTML = `
      <h3>${escapeHtml(course.title)}</h3>
      <div class="meta">
        <span>${escapeHtml(course.code || "Course")} · ${dayLabels[course.day]} · ${course.start}-${course.end}</span>
        <span>${escapeHtml(course.professor || "Professor pending")}</span>
        <span>${escapeHtml(formatLocation(course))}</span>
      </div>
      ${hasConflict ? `<span class="conflict-badge">Time clash</span>` : ""}
      ${course.suggested ? `<span class="suggested-badge">Suggested by semester plan</span>` : ""}
      ${course.editing ? renderCourseEditor(course) : ""}
      <span class="course-actions">
        <label class="toggle-row">
          <input type="checkbox" ${course.selected ? "checked" : ""} data-course="${course.id}">
          Include in timetable
        </label>
        <button class="edit-course" type="button" data-edit="${course.id}">${course.editing ? "Done" : "Edit"}</button>
        <button class="remove-course" type="button" data-remove="${course.id}">Remove</button>
      </span>
    `;
    el.courseList.append(card);
  });
}

function renderCourseEditor(course) {
  return `
    <div class="course-editor" data-editor="${course.id}">
      <input data-edit-field="code" data-id="${course.id}" type="text" value="${escapeHtml(course.code)}" placeholder="Course code">
      <input data-edit-field="title" data-id="${course.id}" type="text" value="${escapeHtml(course.title)}" placeholder="Course name">
      <input data-edit-field="professor" data-id="${course.id}" type="text" value="${escapeHtml(course.professor)}" placeholder="Professor">
      <input data-edit-field="room" data-id="${course.id}" type="text" value="${escapeHtml(course.room)}" placeholder="Hall / room">
      <select data-edit-field="day" data-id="${course.id}">
        ${Object.entries(dayLabels).map(([value, label]) => `<option value="${value}" ${course.day === value ? "selected" : ""}>${label}</option>`).join("")}
      </select>
      <input data-edit-field="start" data-id="${course.id}" type="time" value="${escapeHtml(course.start)}">
      <input data-edit-field="end" data-id="${course.id}" type="time" value="${escapeHtml(course.end)}">
    </div>
  `;
}

function renderStats() {
  const selected = getSelectedCourses().length;
  const total = courses.length;
  const conflicts = getConflicts(getSelectedCourses()).length;
  el.courseStats.textContent = total
    ? `${total} course${total === 1 ? "" : "s"} found · ${selected} selected${conflicts ? ` · ${conflicts} clash${conflicts === 1 ? "" : "es"}` : ""}`
    : "No timetable loaded yet.";
}

function renderConflicts() {
  const conflicts = getConflicts(getSelectedCourses());
  if (!conflicts.length) {
    el.conflictPanel.innerHTML = "";
    return;
  }

  el.conflictPanel.innerHTML = `
    <h2>Time clashes to review</h2>
    <p>These are warnings only. You can still export the timetable if the clash is intentional.</p>
    <div class="conflict-list">
      ${conflicts.map((conflict) => `
        <div class="conflict-item">
          <strong>${dayLabels[conflict.day]} ${conflict.start}-${conflict.end}</strong>
          <span>${escapeHtml(conflict.first.title)} / ${escapeHtml(conflict.second.title)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTimetable() {
  const selected = getSelectedCourses();
  const slots = getTimeSlots(selected);
  const days = Object.entries(dayLabels);

  if (!selected.length) {
    el.calendarGrid.innerHTML = `
      <table class="timetable-table">
        <thead>
          <tr>
            <th>Time</th>
            ${days.map(([, label]) => `<th>${label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="6" class="empty-table-cell">Select courses to build your personal timetable.</td>
          </tr>
        </tbody>
      </table>
    `;
    renderBlockDetails(selected);
    return;
  }

  el.calendarGrid.innerHTML = `
    <table class="timetable-table">
      <thead>
        <tr>
          <th>Time</th>
          ${days.map(([, label]) => `<th>${label}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${slots.map((slot) => `
          <tr>
            <th class="time-cell">${slot.start}-${slot.end}</th>
            ${days.map(([dayCode]) => {
              const coursesInCell = selected
                .filter((course) => course.day === dayCode && course.start === slot.start && course.end === slot.end)
                .sort((a, b) => a.title.localeCompare(b.title));
              return `<td>${coursesInCell.map(renderTableCourse).join("")}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  renderBlockDetails(selected);
}

function getTimeSlots(selected) {
  const slots = selected
    .map((course) => ({ start: course.start, end: course.end }))
    .filter((slot) => slot.start && slot.end);
  const seen = new Set();
  return slots
    .filter((slot) => {
      const key = `${slot.start}-${slot.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start) || timeToMinutes(a.end) - timeToMinutes(b.end));
}

function renderTableCourse(course) {
  const location = formatLocation(course);
  return `
    <article class="table-course">
      <strong>${escapeHtml(course.title)}</strong>
      <span>${escapeHtml([course.type, course.professor].filter(Boolean).join(" · "))}</span>
      ${location ? `<span>${escapeHtml(location)}</span>` : ""}
      ${course.dates?.length ? `<span>Some dates only - see block section below</span>` : ""}
    </article>
  `;
}

function renderBlockDetails(selected) {
  const blockCourses = selected.filter((course) => course.dates?.length);
  if (!blockCourses.length) {
    el.agendaList.innerHTML = `<p class="agenda-note">No block-course dates found in the selected courses.</p>`;
    return;
  }

  el.agendaList.innerHTML = `
    <table class="block-table">
      <thead>
        <tr>
          <th>Course</th>
          <th>Date(s)</th>
          <th>Time</th>
          <th>Professor</th>
          <th>Location / Mode</th>
        </tr>
      </thead>
      <tbody>
        ${blockCourses.map((course) => `
          <tr>
            <td>${escapeHtml(course.title)}</td>
            <td>${course.dates.map(formatDate).join(", ")}</td>
            <td>${course.start}-${course.end}</td>
            <td>${escapeHtml(course.professor)}</td>
            <td>${escapeHtml(formatLocation(course))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <p class="agenda-note">Where two lecturers or rooms are listed, the source timetable includes both.</p>
  `;
}

function getSelectedCourses() {
  return courses.filter((course) => course.selected);
}

function getConflicts(selected) {
  const conflicts = [];
  selected.forEach((first, firstIndex) => {
    selected.slice(firstIndex + 1).forEach((second) => {
      if (first.day !== second.day) return;
      if (!first.start || !first.end || !second.start || !second.end) return;
      const start = Math.max(timeToMinutes(first.start), timeToMinutes(second.start));
      const end = Math.min(timeToMinutes(first.end), timeToMinutes(second.end));
      if (start < end) {
        conflicts.push({
          day: first.day,
          start: minutesToTime(start),
          end: minutesToTime(end),
          first,
          second,
        });
      }
    });
  });
  return conflicts;
}

function courseHasConflict(course) {
  if (!course.selected) return false;
  return getConflicts(getSelectedCourses()).some((conflict) => conflict.first.id === course.id || conflict.second.id === course.id);
}

function matchesSearch(course) {
  if (!currentSearch) return true;
  const haystack = normalizeForMatch([
    course.code,
    course.title,
    course.professor,
    course.room,
    course.roomCode,
    dayLabels[course.day],
  ].filter(Boolean).join(" "));
  return haystack.includes(currentSearch);
}

function addManualCourse() {
  const title = el.manualTitle.value.trim();
  if (!title) {
    el.manualTitle.focus();
    return;
  }
  courses.push({
    id: crypto.randomUUID(),
    title,
    professor: el.manualProfessor.value.trim(),
    room: el.manualRoom.value.trim(),
    roomCode: "",
    type: "Course",
    day: el.manualDay.value,
    start: el.manualStart.value,
    end: el.manualEnd.value,
    selected: true,
  });
  el.manualTitle.value = "";
  render();
}

function parseTimetableText(text) {
  const lines = prepareLines(text);
  const parsed = [];
  let currentDay = "";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const dayCode = getDayCode(line);
    if (dayCode) {
      currentDay = dayCode;
      index += 1;
      continue;
    }

    const range = parseTimeRange(line);
    if (currentDay && range) {
      const collected = collectCourseDetails(lines, index + 1);
      const details = range.remainder ? [range.remainder, ...collected.details] : collected.details;
      const nextIndex = collected.nextIndex;
      const course = detailsToCourse(details, currentDay, range.start, range.end);
      if (course) parsed.push(course);
      index = nextIndex;
      continue;
    }

    const startTime = parseTime(line);
    if (currentDay && startTime && parseTime(lines[index + 1])) {
      const start = startTime;
      const end = parseTime(lines[index + 1]);
      index += 2;
      const details = [];
      while (
        index < lines.length &&
        !getDayCode(lines[index]) &&
        !parseTimeRange(lines[index]) &&
        !parseTime(lines[index])
      ) {
        details.push(lines[index]);
        index += 1;
      }
      const course = detailsToCourse(details, currentDay, start, end);
      if (course) parsed.push(course);
      continue;
    }

    if (currentDay && startTime) {
      const { details, nextIndex } = collectCourseDetails(lines, index + 1);
      const nextStart = parseTime(lines[nextIndex]) || "";
      const start = startTime;
      const end = nextStart && nextStart > start ? nextStart : addMinutes(start, 90);
      const course = detailsToCourse(details, currentDay, start, end);
      if (course) parsed.push(course);
      index = nextIndex;
      continue;
    }
    index += 1;
  }

  return dedupeCourses(parsed);
}

function detailsToCourse(details, day, start, end) {
  const cleanedDetails = details.map(cleanLine).filter((line) => line && !isNoiseLine(line));
  if (!cleanedDetails.length) return null;
  const normalizedDetails = moveTrailingCourseType(cleanedDetails);
  const modeIndex = normalizedDetails.findIndex((line) => /^(L&E|L|PT|E|P|S|V|Ü)\b/i.test(line));
  const possibleTitleLines = getTitleLines(details, modeIndex);
  const blockIndex = possibleTitleLines.findIndex((line) => /^Block course:/i.test(line));
  const titleLines = blockIndex > -1 ? possibleTitleLines.slice(0, blockIndex) : possibleTitleLines;
  const titleRaw = titleLines.join(" ").replace(/\s+/g, " ").trim();
  const codeMatch = titleRaw.match(/^(\d{4})\s*(.+)$/);
  const code = codeMatch ? codeMatch[1] : "";
  const title = codeMatch ? codeMatch[2] : titleRaw;
  if (!title) return null;
  const typeMatch = modeIndex > -1 ? normalizedDetails[modeIndex].match(/^(L&E|L|PT|E|P|S|V|Ü)\b\s*(.*)$/i) : null;
  const type = typeMatch ? typeMatch[1] : "";
  const inlineAfterType = typeMatch?.[2] ? [typeMatch[2]] : [];
  const rest = modeIndex === 0
    ? normalizedDetails.slice(1 + titleLines.length)
    : modeIndex > 0
      ? [...inlineAfterType, ...normalizedDetails.slice(modeIndex + 1)]
      : normalizedDetails.slice(titleLines.length);
  const dates = extractDates(normalizedDetails.join(" "));
  const meta = extractCourseMeta(rest);

  return {
    id: crypto.randomUUID(),
    code,
    title,
    professor: meta.professor,
    room: meta.room,
    roomCode: meta.roomCode,
    type,
    day,
    start,
    end,
    dates,
    selected: true,
  };
}

function extractCourseMeta(rest) {
  let professor = "";
  let room = "";
  let roomCode = "";

  rest.forEach((line) => {
    if (!roomCode) {
      const roomCodeMatch = line.match(/\b\d{2}\s+\d{2}\s+\d{3}\b/);
      if (roomCodeMatch) roomCode = roomCodeMatch[0];
    }

    if (isProfessorLine(line) && !professor) {
      const split = splitProfessorAndRoom(line);
      professor = split.professor;
      if (!room && split.room) room = split.room;
      return;
    }

    if (!room && isLikelyRoomLine(line)) {
      room = line.replace(/\b\d{2}\s+\d{2}\s+\d{3}\b/g, "").trim();
    }
  });

  return { professor, room, roomCode };
}

function splitProfessorAndRoom(line) {
  const roomStart = line.search(/\b(tba|physik-raum|seminarraum|pc-pool|pool|lab|labor|raum|room|digital|online|rag)\b/i);
  if (roomStart === -1) return { professor: line, room: "" };
  return {
    professor: line.slice(0, roomStart).trim(),
    room: line.slice(roomStart).replace(/\b\d{2}\s+\d{2}\s+\d{3}\b/g, "").trim(),
  };
}

function isLikelyRoomLine(line) {
  return /\b(tba|physik-raum|seminarraum|pc-pool|pool|lab|labor|raum|room|digital|online|rag)\b/i.test(line) ||
    /\b\d{2}\s+\d{2}\s+\d{3}\b/.test(line);
}

function getTitleLines(details, modeIndex) {
  const cleanedDetails = moveTrailingCourseType(details.map(cleanLine).filter((line) => line && !isNoiseLine(line)));
  const titleSource = modeIndex === 0
    ? cleanedDetails.slice(1)
    : modeIndex > 0
      ? cleanedDetails.slice(0, modeIndex)
      : cleanedDetails;

  const titleLines = [];
  for (const line of titleSource) {
    if (isCourseMetadata(line)) break;
    titleLines.push(line);
  }
  return titleLines.length ? titleLines : titleSource.slice(0, 2);
}

function isCourseMetadata(line) {
  return isProfessorLine(line) ||
    /^\d{2}\s+\d{2}\s+\d{3}$/.test(line) ||
    /^Block course:/i.test(line) ||
    /\b\d{2}\.\d{2}\.\d{2,4}\b/.test(line);
}

function prepareLines(text) {
  return text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map(cleanLine)
    .flatMap(splitPackedLine)
    .map(cleanLine)
    .filter(Boolean);
}

function cleanLine(line = "") {
  let cleaned = String(line).replace(/\s+/g, " ").trim();
  cleaned = collapseSpacedLetterRuns(cleaned);
  cleaned = cleaned.replace(/\b([A-ZÄÖÜ])\s+([a-zäöüß]{2,})/g, "$1$2");
  cleaned = cleaned.replace(/\bD\s*r\s*\./g, "Dr.");
  cleaned = cleaned.replace(/\bP\s*r\s*o\s*f\s*\./g, "Prof.");
  cleaned = cleaned.replace(/(\d{4})(?=[A-Za-zÄÖÜäöüß])/g, "$1 ");
  cleaned = cleaned.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1 $2");
  cleaned = cleaned.replace(/([a-zäöüß])and(?=\s+[A-ZÄÖÜ])/g, "$1 and");
  return cleaned;
}

function collapseSpacedLetterRuns(line) {
  return line.replace(/(?:\b[A-Za-zÄÖÜäöüß]\b\s*){3,}/g, (match) => match.replace(/\s+/g, ""));
}

function splitPackedLine(line) {
  const timeRangePattern = /(\b\d{1,2}[:.]\d{2}\s*(?:-|–|—|to|bis)\s*\d{1,2}[:.]\d{2}\b)/i;
  const match = line.match(timeRangePattern);
  if (match && line !== match[0]) {
    return line.split(timeRangePattern).map((part) => part.trim()).filter(Boolean);
  }
  return [line];
}

function getDayCode(line = "") {
  const normalized = line.replace(/:$/, "").trim().toLowerCase();
  return Object.entries(dayNameToCode).find(([label]) => label.toLowerCase() === normalized)?.[1] || "";
}

function collectCourseDetails(lines, startIndex) {
  const details = [];
  let index = startIndex;
  while (
    index < lines.length &&
    !getDayCode(lines[index]) &&
    !parseTimeRange(lines[index]) &&
    !parseTime(lines[index])
  ) {
    details.push(lines[index]);
    index += 1;
  }
  return { details, nextIndex: index };
}

function isNoiseLine(line = "") {
  return /^(seite|page)\s+\d+/i.test(line) ||
    /^information engineering and computer sciences/i.test(line) ||
    /^\d{1,2}\.\s*semester$/i.test(line) ||
    /^semester$/i.test(line);
}

function isProfessorLine(line = "") {
  return /^(Prof\.|Professor|Mr\.|Ms\.|Mrs\.|Dr\.)/i.test(line);
}

function parseTimeRange(value = "") {
  const match = value.match(/\b(\d{1,2})[:.](\d{2})\s*(?:(?:-|–|—|to|bis)\s*)?(\d{1,2})[:.](\d{2})(.*)$/i);
  if (!match) return null;
  return {
    start: `${match[1].padStart(2, "0")}:${match[2]}`,
    end: `${match[3].padStart(2, "0")}:${match[4]}`,
    remainder: cleanLine(match[5] || ""),
  };
}

function moveTrailingCourseType(details) {
  return details.flatMap((line) => {
    const match = line.match(/^(.+?)(?:\s+(L&E|L|PT|E|P|S|V|Ü)|(L&E|PT))$/i);
    if (!match) return [line];
    return [match[2] || match[3], match[1]];
  });
}

function pdfItemsToLines(items) {
  const rows = [];
  items.forEach((item) => {
    const text = cleanLine(item.str);
    if (!text) return;
    const x = Math.round(item.transform[4]);
    const y = Math.round(item.transform[5]);
    const width = Number(item.width) || 0;
    const height = Number(item.height) || Math.abs(Number(item.transform?.[3])) || 10;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 3);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, text, width, height });
  });
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => pdfRowToLine(row.items))
    .join("\n");
}

function pdfRowToLine(items) {
  const sorted = items.sort((a, b) => a.x - b.x);
  let line = "";
  let previousRight = null;

  sorted.forEach((item) => {
    const gap = previousRight === null ? 0 : item.x - previousRight;
    const gapThreshold = Math.max(2.5, item.height * 0.28);
    const needsSpace = line && gap > gapThreshold && !/^\s/.test(item.text);
    line += `${needsSpace ? " " : ""}${item.text}`;
    previousRight = Math.max(previousRight ?? item.x, item.x + item.width);
  });

  return cleanLine(line);
}

function setImportSummary(message) {
  el.importSummary.innerHTML = message
    ? `<div class="summary-pill">${escapeHtml(message)}</div>`
    : "";
}

function extractDates(text) {
  const matches = text.match(/\b\d{2}\.\d{2}\.\d{2,4}\b/g) || [];
  return matches.map((date) => {
    const [day, month, year] = date.split(".");
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month}-${day}`;
  });
}

async function handleFileUpload(file) {
  setImportSummary(`Reading ${file.name}...`);
  el.fileStatus.textContent = `Reading ${file.name}...`;
  el.rawText.value = "";
  courses = [];
  render();
  try {
    const text = await readFileText(file);
    el.rawText.value = text;
    const imported = importParsedText(text);
    if (imported) {
      const selected = getSelectedCourses().length;
      el.fileStatus.textContent = `Imported ${file.name}`;
      setImportSummary(`${courses.length} course${courses.length === 1 ? "" : "s"} found from ${file.name}. ${selected} selected.`);
    }
  } catch (error) {
    el.fileStatus.textContent = "Could not read this timetable here. Paste copied timetable text below.";
    setImportSummary("PDF import failed in this browser. Copy the timetable text from the PDF and use Read Timetable Text.");
  }
}

async function handleSemesterPlanUpload(file) {
  el.semesterPlanStatus.textContent = `Reading ${file.name}...`;
  if (file.type.startsWith("image/")) {
    el.semesterPlanStatus.textContent = `${file.name} added as a visual reference. Upload a text or PDF plan to auto-suggest matches.`;
    return;
  }

  try {
    const text = await readFileText(file);
    semesterPlanText = text;
    const matchCount = suggestCoursesFromPlan(text);
    el.semesterPlanStatus.textContent = matchCount
      ? `${matchCount} timetable course${matchCount === 1 ? "" : "s"} matched your semester plan.`
      : "Semester plan added. No exact course matches found yet.";
    render();
  } catch (error) {
    el.semesterPlanStatus.textContent = "Could not read this semester plan here. You can still select courses manually.";
  }
}

async function readFileText(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractPdfText(file);
  }
  return file.text();
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(pdfItemsToLines(content.items));
  }
  return pages.join("\n\n");
}

async function loadPdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("assets/pdf.worker.min.js", window.location.href).href;
    return window.pdfjsLib;
  }

  throw new Error("PDF.js is not loaded. Check that assets/pdf.min.js is available on the hosted site.");
}

function importParsedText(text) {
  const parsed = parseTimetableText(text);
  if (!parsed.length) {
    courses = [];
    render();
    el.fileStatus.textContent = "No course rows found yet. Try pasting copied timetable text.";
    setImportSummary("No course rows found. Check that the text includes weekdays and times, then try again.");
    return false;
  }
  courses = parsed;
  if (semesterPlanText) suggestCoursesFromPlan(semesterPlanText);
  render();
  setImportSummary(`${courses.length} course${courses.length === 1 ? "" : "s"} found. Review the cards, then select the ones you need.`);
  return true;
}

function suggestCoursesFromPlan(text) {
  const normalizedPlan = normalizeForMatch(text);
  let count = 0;
  courses = courses.map((course) => {
    const courseName = normalizeForMatch(course.title);
    const courseCode = normalizeForMatch(course.code);
    const suggested = Boolean(
      (courseName && normalizedPlan.includes(courseName)) ||
      (courseCode && normalizedPlan.includes(courseCode))
    );
    if (suggested) count += 1;
    return { ...course, suggested };
  });
  return count;
}

function dedupeCourses(list) {
  const seen = new Set();
  return list.filter((course) => {
    const key = normalizeForMatch([course.code, course.title, course.day, course.start, course.end, course.professor, course.room].join(" "));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function downloadIcs() {
  const selected = getSelectedCourses();
  if (!selected.length) {
    el.importSummary.innerHTML = `<div class="summary-pill">Select at least one course before downloading a calendar.</div>`;
    return;
  }
  const start = el.semesterStart.value;
  const end = el.semesterEnd.value;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HSRW Timetable Studio//Semester Planner//EN",
    "CALSCALE:GREGORIAN",
    ...selected.flatMap((course) => courseToEvents(course, start, end)),
    "END:VCALENDAR",
  ].join("\r\n");
  downloadFile("hsrw-personal-timetable.ics", ics, "text/calendar;charset=utf-8");
}

function courseToEvents(course, semesterStart, semesterEnd) {
  const dates = course.dates?.length ? course.dates : [nextWeekdayDate(semesterStart, course.day)];
  return dates.map((date, index) => {
    const isRecurring = !course.dates?.length;
    const startStamp = toIcsDateTime(date, course.start);
    const endStamp = toIcsDateTime(date, course.end);
    const lines = [
      "BEGIN:VEVENT",
      `UID:${course.id}-${index}@hsrw-timetable.local`,
      `DTSTAMP:${toUtcStamp(new Date())}`,
      `DTSTART:${startStamp}`,
      `DTEND:${endStamp}`,
      `SUMMARY:${escapeIcs(course.code ? `${course.code} ${course.title}` : course.title)}`,
      `LOCATION:${escapeIcs(formatLocation(course))}`,
      `DESCRIPTION:${escapeIcs([course.professor, course.type].filter(Boolean).join(" · "))}`,
    ];
    if (isRecurring) {
      lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${toIcsDate(semesterEnd)}T235959`);
    }
    lines.push("END:VEVENT");
    return lines.join("\r\n");
  });
}

function nextWeekdayDate(startDate, dayCode) {
  const target = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"].indexOf(dayCode);
  if (!startDate || target < 0) return startDate;
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const diff = (target - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return toLocalIsoDate(date);
}

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function formatLocation(course) {
  return [course.room, course.roomCode].filter(Boolean).join(" · ");
}

function isTime(value) {
  return Boolean(parseTime(value));
}

function parseTime(value = "") {
  const match = String(value).trim().match(/^(\d{1,2})[:.](\d{2})(?:\s*(?:Uhr|h))?$/i);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeTime(value) {
  return parseTime(value);
}

function addMinutes(time, minutesToAdd) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes + minutesToAdd);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function toIcsDate(value) {
  return value.replaceAll("-", "");
}

function toIcsDateTime(date, time) {
  return `${toIcsDate(date)}T${time.replace(":", "")}00`;
}

function toUtcStamp(date) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function escapeIcs(value = "") {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function normalizeForMatch(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function startTour(force = false) {
  if (!force && localStorage.getItem("hsrwTimetableTourSeen") === "yes") return;
  activeTourIndex = 0;
  el.tourOverlay.classList.add("active");
  el.tourOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("tour-open");
  updateTour();
}

function finishTour() {
  localStorage.setItem("hsrwTimetableTourSeen", "yes");
  clearTourHighlight();
  el.tourOverlay.classList.remove("active");
  el.tourOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("tour-open");
}

function updateTour() {
  const step = tourSteps[activeTourIndex];
  const target = step.target();
  clearTourHighlight();
  if (target) {
    target.classList.add("tour-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }

  el.tourProgress.textContent = `Step ${activeTourIndex + 1} of ${tourSteps.length}`;
  el.tourTitle.textContent = step.title;
  el.tourBody.textContent = step.body;
  el.tourBackButton.disabled = activeTourIndex === 0;
  el.tourNextButton.textContent = activeTourIndex === tourSteps.length - 1 ? "Done" : "Next";
  positionTourCard(target);
  setTimeout(() => el.tourCard.focus(), 120);
}

function positionTourCard(target) {
  const cardWidth = Math.min(380, window.innerWidth - 32);
  el.tourCard.style.width = `${cardWidth}px`;

  if (!target) {
    el.tourCard.style.left = "16px";
    el.tourCard.style.top = "16px";
    return;
  }

  const rect = target.getBoundingClientRect();
  const gap = 14;
  const preferRight = rect.right + gap + cardWidth < window.innerWidth;
  const preferBelow = rect.bottom + gap + 220 < window.innerHeight;
  const left = preferRight ? rect.right + gap : Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
  const top = preferBelow ? rect.bottom + gap : Math.max(16, Math.min(rect.top, window.innerHeight - 240));

  el.tourCard.style.left = `${left}px`;
  el.tourCard.style.top = `${top}px`;
}

function clearTourHighlight() {
  document.querySelectorAll(".tour-highlight").forEach((item) => item.classList.remove("tour-highlight"));
}

function updateEditedCourse(target) {
  const field = target.dataset.editField;
  const id = target.dataset.id;
  if (!field || !id) return;
  const value = field === "start" || field === "end" ? normalizeTime(target.value) || target.value : target.value.trim();
  courses = courses.map((course) => course.id === id ? { ...course, [field]: value } : course);
  renderStats();
  renderConflicts();
  renderTimetable();
}

el.courseList.addEventListener("change", (event) => {
  const id = event.target.dataset.course;
  if (!id) return;
  const course = courses.find((item) => item.id === id);
  if (course) course.selected = event.target.checked;
  render();
});
el.courseList.addEventListener("click", (event) => {
  const removeId = event.target.dataset.remove;
  const editId = event.target.dataset.edit;
  if (removeId) {
    event.preventDefault();
    courses = courses.filter((course) => course.id !== removeId);
    render();
  }
  if (editId) {
    event.preventDefault();
    courses = courses.map((course) => course.id === editId ? { ...course, editing: !course.editing } : course);
    render();
  }
});
el.courseList.addEventListener("input", (event) => {
  updateEditedCourse(event.target);
});
el.courseList.addEventListener("change", (event) => {
  updateEditedCourse(event.target);
});

[el.studentName, el.programmeName, el.semesterStart, el.semesterEnd].forEach((input) => {
  input.addEventListener("input", renderHeader);
});

el.addManualButton.addEventListener("click", addManualCourse);
el.parseTextButton.addEventListener("click", () => importParsedText(el.rawText.value));
el.sampleButton.addEventListener("click", () => {
  el.rawText.value = sampleTimetableText;
  el.fileStatus.textContent = "Sample timetable loaded";
  importParsedText(sampleTimetableText);
});
el.courseSearch.addEventListener("input", () => {
  currentSearch = normalizeForMatch(el.courseSearch.value);
  renderCourseList();
});
el.selectAllButton.addEventListener("click", () => {
  courses = courses.map((course) => matchesSearch(course) ? { ...course, selected: true } : course);
  render();
});
el.clearSelectionButton.addEventListener("click", () => {
  courses = courses.map((course) => matchesSearch(course) ? { ...course, selected: false } : course);
  render();
});
el.printButton.addEventListener("click", () => window.print());
el.icsButton.addEventListener("click", downloadIcs);
el.sourceFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) handleFileUpload(file);
});
el.semesterPlanFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) handleSemesterPlanUpload(file);
});
el.tourLauncher.addEventListener("click", () => startTour(true));
el.tourNextButton.addEventListener("click", () => {
  if (activeTourIndex === tourSteps.length - 1) {
    finishTour();
    return;
  }
  activeTourIndex += 1;
  updateTour();
});
el.tourBackButton.addEventListener("click", () => {
  if (activeTourIndex === 0) return;
  activeTourIndex -= 1;
  updateTour();
});
el.tourSkipButton.addEventListener("click", finishTour);
el.tourOverlay.addEventListener("click", (event) => {
  if (event.target.dataset.tourClose !== undefined) finishTour();
});
window.addEventListener("resize", () => {
  if (el.tourOverlay.classList.contains("active")) updateTour();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && el.tourOverlay.classList.contains("active")) finishTour();
});

render();
setTimeout(() => startTour(), 700);
