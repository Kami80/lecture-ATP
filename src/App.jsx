import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createIcons, icons } from "lucide";

const toc = [
  { number: "1", title: "Introduction", page: "2" },
  { number: "2", title: "Transport Equations", page: "4", open: true, children: [{ number: "2.1", title: "Eulerian vs. Lagrangian formulations" }] },
  { number: "3", title: "Conservation of mass", page: "8", children: [{ number: "3.1", title: "Eulerian approach" }, { number: "3.2", title: "Macroscopic approach" }, { number: "3.3", title: "Lagrangian approach" }] },
  { number: "4", title: "Conservation of chemical species", page: "11", children: [{ number: "4.1", title: "Eulerian approach" }, { number: "4.2", title: "Macroscopic approach" }, { number: "4.3", title: "Lagrangian approach" }] },
  { number: "5", title: "Conservation of momentum", page: "16", children: [{ number: "5.1", title: "Molecular stress tensor" }, { number: "5.2", title: "Convective flux tensor" }, { number: "5.3", title: "Combined flux tensor" }] },
  { number: "6", title: "Conservation of energy", page: "23" },
  { number: "7", title: "Constitutive laws", page: "31", children: [{ number: "7.1", title: "Mass diffusion fluxes" }, { number: "7.2", title: "Conductive heat flux" }, { number: "7.3", title: "Momentum diffusion fluxes" }] },
];

const initialNotes = [
  { id: 1, title: "Key idea: substantial derivative", body: "Links the Lagrangian and Eulerian views. Represents the time rate of change of a property φ for a fluid particle moving with velocity v.", source: "Section 2.1 · p. 5", updated: "10 min ago" },
  { id: 2, title: "Control volumes and ALE", body: "ALE is the generalized form: a control volume may deform in time and does not have to move with the fluid.", source: "Section 2.1 · p. 5", updated: "28 min ago" },
];

const initialComments = [
  { id: 1, author: "You", initials: "AC", tone: "green", time: "10 min ago", quote: "A more general description allows control volumes that deform in time (Arbitrary Lagrangian-Eulerian, ALE).", body: "Good transition to ALE!" },
  { id: 2, author: "You", initials: "AC", tone: "green", time: "25 min ago", body: "The substantial derivative is the key link between the two formulations." },
  { id: 3, author: "Marco K.", initials: "MK", tone: "rose", time: "1 hour ago", body: "Is the velocity in the substantial derivative the local fluid velocity or the velocity of the control volume surface?", reply: "Good question — here v is the local velocity of the particle." },
];

const tools = [
  { id: "pointer", label: "Select", icon: "mouse-pointer-2" },
  { id: "highlight", label: "Highlight", icon: "highlighter" },
  { id: "pen", label: "Pen", icon: "pen-line" },
  { id: "arrow", label: "Arrow", icon: "arrow-up-right" },
  { id: "text", label: "Text", icon: "type" },
  { id: "comment", label: "Comment", icon: "message-square" },
  { id: "shape", label: "Shape", icon: "square" },
  { id: "eraser", label: "Eraser", icon: "eraser" },
];
const drawTools = new Set(["pen", "arrow", "shape"]);

const shareEncoder = (payload) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const shareDecoder = (encoded) => {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const escapeHtml = (value = "") => String(value).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character]));

const distanceToStroke = (point, stroke) => {
  if (!stroke?.points?.length) return Number.POSITIVE_INFINITY;
  const xs = stroke.points.map((item) => item.x);
  const ys = stroke.points.map((item) => item.y);
  const dx = Math.max(Math.min(...xs) - point.x, 0, point.x - Math.max(...xs));
  const dy = Math.max(Math.min(...ys) - point.y, 0, point.y - Math.max(...ys));
  return Math.hypot(dx, dy);
};

function Icon({ name, size = 16, className = "" }) {
  return <i aria-hidden="true" className={`icon ${className}`} data-lucide={name} style={{ width: size, height: size }} />;
}

function Toggle({ checked, onChange, label }) {
  return <button className={`toggle ${checked ? "is-on" : ""}`} onClick={onChange} aria-label={label} aria-pressed={checked}><span /></button>;
}

function SketchCanvas({ strokes, setStrokes, activeTool, label, className = "", canvasHandle }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const startRef = useRef(null);
  const draftRef = useRef(null);

  const paintStroke = useCallback((ctx, stroke) => {
    if (!stroke?.points?.length) return;
    const [first, ...rest] = stroke.points;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (stroke.type === "highlight") {
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = "#e5b34c";
      ctx.lineWidth = 18;
    } else {
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = stroke.type === "arrow" ? "#c4552d" : "#2f5d4a";
      ctx.lineWidth = stroke.type === "shape" ? 2 : 2.4;
    }
    if (stroke.type === "shape" && rest[0]) {
      const end = rest[rest.length - 1];
      ctx.strokeRect(first.x, first.y, end.x - first.x, end.y - first.y);
    } else {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      rest.forEach((point) => ctx.lineTo(point.x, point.y));
      if (rest.length === 0) ctx.lineTo(first.x + 0.1, first.y + 0.1);
      ctx.stroke();
      if (stroke.type === "arrow" && rest[0]) {
        const end = rest[rest.length - 1];
        const before = rest[Math.max(0, rest.length - 2)] || first;
        const angle = Math.atan2(end.y - before.y, end.x - before.x);
        const size = 9;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
    ctx.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokes.forEach((stroke) => paintStroke(ctx, stroke));
    if (draft) paintStroke(ctx, draft);
  }, [draft, paintStroke, strokes]);

  useEffect(() => {
    redraw();
    const observer = new ResizeObserver(redraw);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    if (!canvasHandle) return undefined;
    canvasHandle.current = canvasRef.current;
    return () => { canvasHandle.current = null; };
  }, [canvasHandle]);

  const pointFromEvent = (event) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const onPointerDown = (event) => {
    if (activeTool === "eraser") {
      const point = pointFromEvent(event);
      setStrokes((current) => {
        if (!current.length) return current;
        let closestIndex = -1;
        let closestDistance = 28;
        current.forEach((stroke, index) => {
          const distance = distanceToStroke(point, stroke);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });
        return closestIndex === -1 ? current : current.filter((_, index) => index !== closestIndex);
      });
      return;
    }
    if (!drawTools.has(activeTool)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    startRef.current = point;
    draftRef.current = { type: activeTool, points: [point] };
    setDraft(draftRef.current);
  };
  const onPointerMove = (event) => {
    if (!draftRef.current) return;
    const point = pointFromEvent(event);
    const nextPoints = activeTool === "shape" || activeTool === "arrow" ? [startRef.current, point] : [...draftRef.current.points, point];
    draftRef.current = { ...draftRef.current, points: nextPoints };
    setDraft(draftRef.current);
  };
  const onPointerUp = () => {
    if (!draftRef.current) return;
    setStrokes((current) => [...current, draftRef.current]);
    draftRef.current = null;
    startRef.current = null;
    setDraft(null);
  };

  const canInteract = drawTools.has(activeTool) || activeTool === "eraser";
  return <div ref={wrapRef} className={`sketch-canvas ${className} ${canInteract ? "can-draw" : ""} ${activeTool === "eraser" ? "is-eraser" : ""}`} aria-label={label}><canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} /></div>;
}

function App() {
  const [activeNav, setActiveNav] = useState("Lesson");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showContents, setShowContents] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showStudyDock, setShowStudyDock] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [dockTab, setDockTab] = useState("Board");
  const [rightTab, setRightTab] = useState("Comments");
  const [activeTool, setActiveTool] = useState("highlight");
  const [isHighlighted, setIsHighlighted] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(true);
  const [understood, setUnderstood] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(true);
  const [comments, setComments] = useState(initialComments);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState(1);
  const [boardText, setBoardText] = useState("From Lagrangian to Eulerian\n\nDφ / Dt = ∂φ / ∂t + v · ∇φ\n\nApply to mass (φ = ρ):\n∂ρ / ∂t + ∇ · (ρv) = 0");
  const [lectureStrokes, setLectureStrokes] = useState([]);
  const [boardStrokes, setBoardStrokes] = useState([]);
  const [lectureRedo, setLectureRedo] = useState([]);
  const [boardRedo, setBoardRedo] = useState([]);
  const [toast, setToast] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [allowImport, setAllowImport] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareOptions, setShareOptions] = useState({ lecture: true, board: true, notes: true });
  const [sharedPayload, setSharedPayload] = useState(null);
  const [showSharedPrompt, setShowSharedPrompt] = useState(false);
  const [lectureSearch, setLectureSearch] = useState("");
  const [railSearch, setRailSearch] = useState("");
  const [openSections, setOpenSections] = useState({ "Transport Equations": true });
  const fileInputRef = useRef(null);
  const lectureSearchRef = useRef(null);
  const lectureCanvasHandle = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const selectedNote = notes.find((note) => note.id === selectedNoteId) || notes[0];
  const sourcePdfUrl = `${import.meta.env.BASE_URL}Notes_ATP_01_TransportEquations.pdf`;
  const figureUrl = `${import.meta.env.BASE_URL}assets/control-volumes.png`;
  const notify = useCallback((message) => setToast(message), []);

  useEffect(() => { createIcons({ icons, attrs: { "stroke-width": "1.65" } }); });
  useEffect(() => { document.querySelector(".more-nav")?.setAttribute("aria-label", "More"); }, [showMoreMenu]);
  useEffect(() => {
    try {
      const shouldReset = new URLSearchParams(window.location.search).get("fresh") === "1";
      if (shouldReset) localStorage.removeItem("atp-study-session");
      const saved = shouldReset ? null : localStorage.getItem("atp-study-session");
      if (saved) hydrateSession(JSON.parse(saved));
    } catch {
      // A malformed local session should never stop the lesson from opening.
    } finally { setIsLoaded(true); }
  }, []);
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("atp-study-session", JSON.stringify({ notes, comments, lectureStrokes, boardStrokes, boardText, isHighlighted, isBookmarked, understood }));
    } catch {
      notify("Local autosave is unavailable in this browser");
    }
  }, [boardStrokes, boardText, comments, isBookmarked, isHighlighted, isLoaded, lectureStrokes, notes, understood]);
  useEffect(() => {
    const encoded = window.location.hash.startsWith("#share=") ? window.location.hash.slice(7) : "";
    if (!encoded) return;
    try {
      setSharedPayload(shareDecoder(encoded));
      setShowSharedPrompt(true);
    } catch {
      notify("This shared study link is not valid anymore");
    }
  }, [notify]);
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        lectureSearchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setShowShare(false);
        setShowSharedPrompt(false);
        setCommentComposerOpen(false);
        setShowMoreMenu(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  useEffect(() => {
    if (commentComposerOpen) setShowDiscussion(true);
  }, [commentComposerOpen]);
  useEffect(() => {
    const anchor = document.querySelector(".comment-anchor");
    if (!anchor) return undefined;
    anchor.setAttribute("role", "button");
    anchor.setAttribute("tabindex", "0");
    anchor.setAttribute("aria-label", "Open comments for this passage");
    const handleAnchorKeyDown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        anchor.click();
      }
    };
    anchor.addEventListener("keydown", handleAnchorKeyDown);
    return () => anchor.removeEventListener("keydown", handleAnchorKeyDown);
  }, [showDiscussion]);
  useEffect(() => {
    document.querySelectorAll(".dock-tabs button").forEach((button) => {
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(button.textContent.trim() === dockTab));
    });
  }, [dockTab, showStudyDock]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedToolLabel = tools.find((tool) => tool.id === activeTool)?.label || "Select";
  const hydrateSession = (parsed, options = {}) => {
    const mergeSharedParts = options.merge === true;
    const sharedParts = parsed.sharedParts || {};
    const includes = (part) => !mergeSharedParts || sharedParts[part] !== false;
    if (includes("notes") && Array.isArray(parsed.notes)) setNotes(parsed.notes);
    if (includes("notes") && Array.isArray(parsed.comments)) setComments(parsed.comments);
    if (includes("lecture") && Array.isArray(parsed.lectureStrokes)) setLectureStrokes(parsed.lectureStrokes);
    if (includes("board") && Array.isArray(parsed.boardStrokes)) setBoardStrokes(parsed.boardStrokes);
    if (includes("board") && typeof parsed.boardText === "string") setBoardText(parsed.boardText);
    if (includes("lecture") && typeof parsed.isHighlighted === "boolean") setIsHighlighted(parsed.isHighlighted);
    if (includes("lecture") && typeof parsed.isBookmarked === "boolean") setIsBookmarked(parsed.isBookmarked);
    if (includes("lecture") && typeof parsed.understood === "boolean") setUnderstood(parsed.understood);
  };

  const handleTargetClick = () => {
    if (activeTool === "highlight") {
      setIsHighlighted((value) => !value);
      notify(isHighlighted ? "Highlight removed" : "Highlight saved to this passage");
    } else if (activeTool === "comment") {
      setShowDiscussion(true);
      setRightTab("Comments");
      setCommentComposerOpen(true);
      notify("Comment pin placed on this passage");
    } else if (activeTool === "text") {
      setShowStudyDock(true);
      setDockTab("Notes");
      setActiveNav("Notes");
      notify("New linked note ready");
      if (!notes.some((note) => note.id === 3)) {
        setNotes((current) => [...current, { id: 3, title: "New linked note", body: "Write a note about this passage…", source: "Section 2.1 · p. 5", updated: "just now" }]);
        setSelectedNoteId(3);
      }
    }
  };
  const handleUndo = (scope) => {
    const targetScope = scope === "lecture" && showStudyDock && dockTab === "Board" ? "board" : scope;
    const currentStrokes = targetScope === "lecture" ? lectureStrokes : boardStrokes;
    if (!currentStrokes.length) { notify(`Nothing to undo on the ${targetScope}`); return; }
    if (targetScope === "lecture") {
      setLectureStrokes((current) => current.slice(0, -1));
      setLectureRedo((redo) => [...redo, currentStrokes[currentStrokes.length - 1]]);
    } else {
      setBoardStrokes((current) => current.slice(0, -1));
      setBoardRedo((redo) => [...redo, currentStrokes[currentStrokes.length - 1]]);
    }
    notify(`Last ${targetScope} mark undone`);
  };
  const handleRedo = (scope) => {
    const targetScope = scope === "lecture" && showStudyDock && dockTab === "Board" ? "board" : scope;
    const currentRedo = targetScope === "lecture" ? lectureRedo : boardRedo;
    if (!currentRedo.length) { notify(`Nothing to redo on the ${targetScope}`); return; }
    const item = currentRedo[currentRedo.length - 1];
    if (targetScope === "lecture") {
      setLectureRedo((current) => current.slice(0, -1));
      setLectureStrokes((strokes) => [...strokes, item]);
    } else {
      setBoardRedo((current) => current.slice(0, -1));
      setBoardStrokes((strokes) => [...strokes, item]);
    }
    notify(`${targetScope} mark restored`);
  };
  const addComment = () => {
    const body = commentDraft.trim();
    if (!body) return;
    setComments((current) => [...current, { id: Date.now(), author: "You", initials: "AC", tone: "green", time: "just now", body }]);
    setCommentDraft("");
    setCommentComposerOpen(false);
    notify("Comment added and saved");
  };
  const addNote = () => {
    const id = Date.now();
    setNotes((current) => [...current, { id, title: "Untitled note", body: "Start writing…", source: "Section 2.1 · p. 5", updated: "just now" }]);
    setSelectedNoteId(id);
    setDockTab("Notes");
    setActiveNav("Notes");
    notify("New note created");
  };
  const updateSelectedNote = (field, value) => setNotes((current) => current.map((note) => note.id === selectedNoteId ? { ...note, [field]: value, updated: "just now" } : note));

  const sessionPayload = useMemo(() => ({ course: "Advanced Transport Phenomena", lesson: "2.1 Eulerian vs. Lagrangian formulations", source: "Notes_ATP_01_TransportEquations.pdf", exportedAt: new Date().toISOString(), highlights: isHighlighted ? ["A more general description allows control volumes that deform in time (Arbitrary Lagrangian-Eulerian, ALE)."] : [], comments, notes, boardText, lectureStrokes, boardStrokes, isBookmarked, understood, allowImport }), [allowImport, boardStrokes, boardText, comments, isBookmarked, isHighlighted, lectureStrokes, notes, understood]);
  const sharedSessionPayload = useMemo(() => ({
    ...sessionPayload,
    sharedParts: { lecture: shareOptions.lecture, board: shareOptions.board, notes: shareOptions.notes },
    notes: shareOptions.notes ? notes : [],
    comments: shareOptions.notes ? comments : [],
    highlights: shareOptions.lecture && isHighlighted ? sessionPayload.highlights : [],
    lectureStrokes: shareOptions.lecture ? lectureStrokes : [],
    boardText: shareOptions.board ? boardText : "",
    boardStrokes: shareOptions.board ? boardStrokes : [],
  }), [boardStrokes, boardText, comments, isHighlighted, lectureStrokes, notes, sessionPayload, shareOptions]);
  const shareLink = useMemo(() => `${window.location.origin}${window.location.pathname}#share=${shareEncoder(sharedSessionPayload)}`, [sharedSessionPayload]);
  const filteredComments = useMemo(() => {
    const query = railSearch.trim().toLowerCase();
    if (!query) return comments;
    return comments.filter((comment) => [comment.author, comment.body, comment.quote, comment.reply].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [comments, railSearch]);
  const filteredNotes = useMemo(() => {
    const query = railSearch.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => [note.title, note.body, note.source].join(" ").toLowerCase().includes(query));
  }, [notes, railSearch]);
  const lectureSearchMatch = lectureSearch.trim() && ["Eulerian vs. Lagrangian formulations", "substantial derivative", "control volume", "Arbitrary Lagrangian-Eulerian", "ALE", "Dφ / Dt"].some((term) => term.toLowerCase().includes(lectureSearch.trim().toLowerCase()));
  const downloadFile = (filename, contents, type) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  const exportJson = () => { downloadFile("atp-session-annotations.json", JSON.stringify(sessionPayload, null, 2), "application/json"); notify("Session package exported"); };
  const exportPdf = () => {
    const popup = window.open("", "_blank", "width=1050,height=800");
    if (!popup) { notify("Allow pop-ups to create a PDF-ready export"); return; }
    const noteMarkup = notes.map((note) => `<article><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.body)}</p><small>${escapeHtml(note.source)}</small></article>`).join("");
    const commentMarkup = comments.map((comment) => `<article><strong>${escapeHtml(comment.author)}</strong><p>${escapeHtml(comment.body)}</p></article>`).join("");
    const inkPreview = lectureCanvasHandle.current && lectureStrokes.length ? `<img class="ink-preview" src="${lectureCanvasHandle.current.toDataURL("image/png")}" alt="Freehand annotation overlay" />` : "<p class=\"muted\">No freehand marks on this lesson yet.</p>";
    popup.document.write(`<!doctype html><html><head><title>ATP study export</title><style>body{font-family:Georgia,serif;color:#17263c;max-width:840px;margin:48px auto;line-height:1.55}h1{font-size:34px;margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #d9ddd8;padding-bottom:8px}h3{margin-bottom:4px}article{padding:14px 0;border-bottom:1px solid #e5e7e2}pre{white-space:pre-wrap;background:#f5f0e3;padding:18px;border-left:4px solid #496b5a}.ink-preview{display:block;width:100%;height:180px;object-fit:contain;background:#fbfaf6;border:1px solid #e5e7e2}.muted,small{color:#68736d}@media print{body{margin:20mm}}</style></head><body><p>ADVANCED TRANSPORT PHENOMENA · STUDY EXPORT</p><h1>2.1 Eulerian vs. Lagrangian formulations</h1><p>Annotated lecture export with notes, comments, and board work.</p><h2>Lecture annotation summary</h2><p><strong>${isHighlighted ? "Highlighted passage:" : "No highlighted passage."}</strong> ${isHighlighted ? "A more general description allows control volumes that deform in time (Arbitrary Lagrangian-Eulerian, ALE)." : ""}</p><p>${lectureStrokes.length} freehand mark${lectureStrokes.length === 1 ? "" : "s"} captured from the lesson canvas.</p>${inkPreview}<h2>Governing relation</h2><pre>Dφ / Dt = ∂φ / ∂t + v · ∇φ</pre><h2>Board</h2><pre>${escapeHtml(boardText)}</pre><h2>Notes</h2>${noteMarkup}<h2>Comments</h2>${commentMarkup}</body></html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 350);
    notify("PDF export opened — choose Save as PDF");
  };
  const importJson = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        hydrateSession(parsed);
        notify("Annotations imported into this lesson");
      } catch { notify("That file is not a valid ATP session package"); }
    };
    reader.readAsText(file);
    event.target.value = "";
  };
  const copyShareLink = async () => {
    try { await navigator.clipboard.writeText(shareLink); } catch {
      const helper = document.createElement("textarea"); helper.value = shareLink; document.body.appendChild(helper); helper.select(); document.execCommand("copy"); helper.remove();
    }
    setShareCopied(true);
    notify("Share link copied");
  };
  const importSharedWorkspace = () => {
    if (!sharedPayload) return;
    hydrateSession(sharedPayload, { merge: true });
    setShowSharedPrompt(false);
    setSharedPayload(null);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    notify("Shared study package imported");
  };
  const handleTopNav = (item) => {
    setActiveNav(item);
    if (item === "Board" || item === "Notes" || item === "Bookmarks" || item === "References") {
      setDockTab(item);
      setShowStudyDock(true);
    }
    setShowMoreMenu(false);
  };
  const toggleAdvancedTools = () => {
    setShowAdvancedTools((value) => !value);
    setShowMoreMenu(false);
  };
  const returnToFocusMode = () => {
    setShowContents(false);
    setShowDiscussion(false);
    setShowStudyDock(false);
    setShowAdvancedTools(false);
    setCommentComposerOpen(false);
    setActiveNav("Lesson");
    setShowMoreMenu(false);
    notify("Focus mode restored");
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><Icon name="orbit" size={28} /></div><div><div className="brand-name">Advanced Transport Phenomena</div><div className="brand-meta">A. Cuoci <span>·</span> CRECK Modeling Lab</div></div></div>
      <nav className="top-nav" aria-label="Study workspace"><button className={`top-nav-item ${activeNav === "Lesson" ? "is-active" : ""}`} onClick={() => handleTopNav("Lesson")}><Icon name="book-open" size={17} /><span>Lesson</span></button><div className="more-control"><button className={`top-nav-item more-nav ${showMoreMenu ? "is-active" : ""}`} onClick={() => setShowMoreMenu((value) => !value)} aria-expanded={showMoreMenu} aria-haspopup="menu"><Icon name="sliders-horizontal" size={17} /><span>More</span><Icon name={showMoreMenu ? "chevron-up" : "chevron-down"} size={13} /></button>{showMoreMenu ? <div className="more-menu" role="menu"><div className="more-menu-label">Customize your workspace</div><button className="more-menu-item" role="menuitem" onClick={() => { setShowContents((value) => !value); setShowMoreMenu(false); }}><Icon name="panel-left" size={16} /><span>Contents</span><small>{showContents ? "Shown" : "Hidden"}</small></button><button className="more-menu-item" role="menuitem" onClick={() => { setShowDiscussion((value) => !value); setShowMoreMenu(false); }}><Icon name="messages-square" size={16} /><span>Discussion</span><small>{showDiscussion ? "Shown" : "Hidden"}</small></button><button className="more-menu-item" role="menuitem" onClick={() => { setShowStudyDock((value) => !value); setShowMoreMenu(false); }}><Icon name="panel-bottom" size={16} /><span>Board & notes</span><small>{showStudyDock ? "Shown" : "Hidden"}</small></button><button className="more-menu-item" role="menuitem" onClick={toggleAdvancedTools}><Icon name="wrench" size={16} /><span>Advanced tools</span><small>{showAdvancedTools ? "Shown" : "Hidden"}</small></button><div className="more-menu-divider" /><button className="more-menu-item focus-action" role="menuitem" onClick={returnToFocusMode}><Icon name="focus" size={16} /><span>Return to focus mode</span></button></div> : null}</div></nav>
      <div className="top-actions"><label className={`search-box ${lectureSearch ? "has-query" : ""}`}><Icon name="search" size={16} /><input ref={lectureSearchRef} value={lectureSearch} onChange={(event) => setLectureSearch(event.target.value)} placeholder="Search in this lecture…" aria-label="Search in this lecture" /><kbd>⌘ K</kbd>{lectureSearch ? <span className={`search-status ${lectureSearchMatch ? "is-found" : ""}`}>{lectureSearchMatch ? "1 match" : "No match"}</span> : null}</label><button className="avatar" aria-label="Open profile">AC</button></div>
    </header>

    {showSharedPrompt && sharedPayload ? <div className="shared-banner" role="status"><div><strong>Shared study package ready</strong><span>{sharedPayload.notes?.length || 0} notes · {sharedPayload.comments?.length || 0} comments · {sharedPayload.lectureStrokes?.length || 0} ink marks{sharedPayload.allowImport === false ? " · view only" : ""}</span></div><div><button className="quiet-button" onClick={() => { setShowSharedPrompt(false); setSharedPayload(null); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); }}>Dismiss</button><button className="accent-button small" onClick={importSharedWorkspace} disabled={sharedPayload.allowImport === false}><Icon name={sharedPayload.allowImport === false ? "eye" : "download"} size={14} />{sharedPayload.allowImport === false ? "View only" : "Import into my copy"}</button></div></div> : null}
    <div className={`workspace ${showContents ? "" : "hide-contents"} ${showDiscussion ? "" : "hide-discussion"} ${showStudyDock ? "" : "hide-dock"} ${showAdvancedTools ? "show-advanced" : "hide-advanced"}`}>
      <aside className={`contents-sidebar ${showContents ? "" : "is-hidden"}`}><div className="sidebar-heading"><Icon name="book-open" size={19} /><strong>Contents</strong></div><div className="toc-list">{toc.map((item) => { const isOpen = openSections[item.title] || item.open; return <div key={item.number} className="toc-group"><button className={`toc-row ${item.title === "Transport Equations" ? "section-active" : ""}`} onClick={() => setOpenSections((current) => ({ ...current, [item.title]: !isOpen }))}><span className="toc-number">{item.number}</span><span className="toc-title">{item.title}</span><span className="toc-page">{item.page}</span>{item.children ? <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={14} /> : null}</button>{item.children && isOpen ? <div className="toc-children">{item.children.map((child) => <button key={child.number} className={`toc-child ${child.number === "2.1" ? "selected" : ""}`} onClick={() => notify(`${child.number} ${child.title} selected`)}><span>{child.number}</span><span>{child.title}</span>{child.number === "2.1" ? <Icon name="bookmark" size={14} /> : null}</button>)}</div> : null}</div>; })}</div><div className="sidebar-footer"><button onClick={() => { setShowStudyDock(true); setDockTab("Notes"); setActiveNav("Notes"); }}><Icon name="graduation-cap" size={16} />Notes</button><button onClick={() => { setShowStudyDock(true); setDockTab("References"); setActiveNav("References"); }}><Icon name="file-text" size={16} />Figures</button><button onClick={() => { setShowDiscussion(true); setRightTab("Bookmarks"); notify("Bookmarks opened"); }}><Icon name="bookmark" size={16} />Bookmarks</button></div></aside>

      <main className="lesson-area"><div className="lesson-header"><div className="breadcrumb"><span>Lecture 2 of 7</span><Icon name="chevron-right" size={14} /><span>Transport Equations</span></div><div className="lesson-actions"><a href={sourcePdfUrl} target="_blank" rel="noreferrer" className="source-link"><Icon name="book-open" size={15} />From the notes <Icon name="arrow-up-right" size={14} /></a></div></div><div className="lesson-scroll"><div className="lesson-copy"><div className="eyebrow">TRANSPORT EQUATIONS</div><h1>2.1 Eulerian vs. Lagrangian formulations</h1><p className="lesson-subtitle">Two complementary views to describe transport phenomena.</p><p>Conservation and transport equations can be formulated in different ways depending on the choice of the control volume. The Eulerian formulation uses a fixed control volume in space, while the Lagrangian formulation follows a fluid particle as it moves. Both approaches are equivalent and provide the same physics, but they offer different mathematical and practical advantages.</p><section className="equation-card"><div className="equation-label">Substantial (material) derivative <span className="key-chip">Key relation</span><button className={`mini-icon ${isBookmarked ? "is-bookmarked" : ""}`} aria-label={isBookmarked ? "Remove bookmark from relation" : "Bookmark relation"} onClick={() => { setIsBookmarked((value) => !value); notify(isBookmarked ? "Relation bookmark removed" : "Relation bookmarked"); }}><Icon name="bookmark" size={15} /></button></div><div className="equation">Dφ / Dt <span>=</span> ∂φ / ∂t <span>+</span> v · ∇φ</div><p>The substantial derivative links the Lagrangian and Eulerian descriptions. It represents the time rate of change of a property φ following a fluid particle.</p></section><h2>Control volumes</h2><p className={`annotation-target ${isHighlighted ? "is-highlighted" : ""}`} onClick={handleTargetClick} title={`Active tool: ${selectedToolLabel}. Click to annotate this passage.`}>The choice of the control volume determines the formulation. In the Eulerian approach the control volume is fixed in space. In the Lagrangian approach it moves with the fluid. <mark className="target-highlight">A more general description allows control volumes that deform in time (Arbitrary Lagrangian-Eulerian, ALE).</mark><span className="comment-anchor" onClick={(event) => { event.stopPropagation(); setRightTab("Comments"); setCommentComposerOpen(true); }}><Icon name="message-square" size={14} /></span></p><div className="annotation-note"><span>Good transition<br />to ALE!</span><Icon name="corner-right-up" size={24} /></div><figure className="control-figure"><img src={figureUrl} alt="Three control-volume diagrams showing Eulerian, Lagrangian, and Arbitrary Lagrangian-Eulerian approaches" /><figcaption>Figure 2: Examples of control volumes.</figcaption></figure><p className="closing-copy">Using a fixed control volume (Eulerian) is often more convenient because it leads to equations that are easier to handle mathematically. However, the Eulerian and Lagrangian formulations are fully equivalent, and the substantial derivative provides the connection between them.</p></div><div className="annotation-toolbar" aria-label="Lecture annotation tools">{tools.map((tool) => <button key={tool.id} className={`annotation-tool ${activeTool === tool.id ? "is-active" : ""}`} onClick={() => { setActiveTool(tool.id); notify(`${tool.label} tool selected`); }} title={tool.label} aria-label={tool.label}><Icon name={tool.icon} size={18} /><span>{tool.label}</span></button>)}<div className="tool-divider" /><button className="annotation-tool" onClick={() => handleUndo("lecture")} title="Undo" aria-label="Undo"><Icon name="undo-2" size={18} /><span>Undo</span></button><button className="annotation-tool" onClick={() => handleRedo("lecture")} title="Redo" aria-label="Redo"><Icon name="redo-2" size={18} /><span>Redo</span></button></div><SketchCanvas strokes={lectureStrokes} setStrokes={(next) => { setLectureStrokes(next); setLectureRedo([]); }} activeTool={activeTool} label="Draw on the lecture" className="lecture-sketch" canvasHandle={lectureCanvasHandle} /></div></main>

      <aside className="right-rail"><div className="rail-tabs" role="tablist">{[{ label: "Notes", count: notes.length }, { label: "Comments", count: comments.length }, { label: "Bookmarks", count: isBookmarked ? 1 : 0 }].map((tab) => <button key={tab.label} className={`rail-tab ${rightTab === tab.label ? "is-active" : ""}`} onClick={() => { setRightTab(tab.label); setRailSearch(""); }} role="tab" aria-selected={rightTab === tab.label}>{tab.label} <span>{tab.count}</span></button>)}</div><label className="rail-search"><Icon name="search" size={15} /><input value={railSearch} onChange={(event) => setRailSearch(event.target.value)} placeholder={rightTab === "Comments" ? "Search comments on this page…" : `Search ${rightTab.toLowerCase()}…`} aria-label="Search current study material" /></label>{rightTab === "Comments" ? <div className="comments-list">{filteredComments.length ? filteredComments.map((comment) => <article className="comment-card" key={comment.id}><div className="comment-head"><span className={`person-avatar ${comment.tone}`}>{comment.initials}</span><strong>{comment.author}</strong><time>{comment.time}</time><button className="kebab" aria-label="Comment actions"><Icon name="more-vertical" size={16} /></button></div>{comment.quote ? <p className="comment-quote">{comment.quote}</p> : null}<p>{comment.body}</p>{comment.reply ? <div className="comment-reply"><span className="person-avatar green">AC</span><div><strong>You</strong><p>{comment.reply}</p></div></div> : null}<button className="reply-link" onClick={() => { setCommentComposerOpen(true); notify("Reply composer opened"); }}>Reply</button></article>) : <div className="empty-state">No comments match “{railSearch}”.</div>}{commentComposerOpen ? <div className="comment-composer"><textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Write a comment linked to this passage…" autoFocus /><div><button className="quiet-button" onClick={() => setCommentComposerOpen(false)}>Cancel</button><button className="accent-button small" onClick={addComment}>Add comment</button></div></div> : null}</div> : null}{rightTab === "Notes" ? <div className="rail-notes">{filteredNotes.length ? filteredNotes.map((note) => <button key={note.id} className={`rail-note ${selectedNoteId === note.id ? "selected" : ""}`} onClick={() => { setSelectedNoteId(note.id); setDockTab("Notes"); }}><Icon name="file-text" size={15} /><span><strong>{note.title}</strong><small>{note.source}</small></span><Icon name="chevron-right" size={14} /></button>) : <div className="empty-state">No notes match “{railSearch}”.</div>}<button className="new-note-link" onClick={addNote}><Icon name="plus" size={15} />New note</button></div> : null}{rightTab === "Bookmarks" ? <div className="rail-notes">{isBookmarked ? <button className="rail-note selected" onClick={() => notify("Jumped to the substantial derivative")}><Icon name="bookmark" size={15} /><span><strong>Eulerian vs. Lagrangian formulations</strong><small>Section 2.1 · p. 5</small></span><Icon name="chevron-right" size={14} /></button> : <div className="empty-state">No bookmarks in this lesson.</div>}<button className="rail-note" onClick={() => notify("Continuity equation is in the next section")}><Icon name="bookmark" size={15} /><span><strong>Continuity equation</strong><small>Next · Section 3 · p. 8</small></span><Icon name="chevron-right" size={14} /></button></div> : null}<div className="practice-card"><div className="practice-title"><Icon name="pencil" size={17} /><strong>Practice</strong><button onClick={() => setPracticeOpen((value) => !value)} aria-label="Toggle practice"><Icon name={practiceOpen ? "chevron-up" : "chevron-down"} size={15} /></button></div>{practiceOpen ? <><div className="practice-question"><span className="question-mark">?</span><p>Which terms appear in the substantial derivative, and what is their physical meaning?</p></div><button className="hint-button" onClick={() => notify("Hint: separate local and convective change")}>Show hint <Icon name="chevron-down" size={14} /></button></> : null}<button className={`understood-button ${understood ? "is-done" : ""}`} onClick={() => { setUnderstood((value) => !value); notify(understood ? "Concept moved back to review" : "Concept marked understood"); }}><Icon name="check" size={17} />{understood ? "Concept understood" : "Mark concept understood"}<Icon name="chevron-right" size={16} /></button></div></aside>

      <section className="study-dock" aria-label="Study tools"><div className="dock-header"><div className="dock-title"><Icon name={dockTab === "Board" ? "pen-line" : dockTab === "Notes" ? "notebook-pen" : "library"} size={17} /><strong>{dockTab === "Board" ? "Board" : dockTab}</strong><span>— {dockTab === "Board" ? "Freeform derivation workspace" : dockTab === "Notes" ? "Linked notes for this lesson" : "Study materials"}</span></div><div className="dock-actions"><button onClick={exportPdf}><Icon name="file-down" size={15} />Export PDF</button><button onClick={exportJson}><Icon name="download" size={15} />Export package</button><button onClick={() => fileInputRef.current?.click()}><Icon name="upload" size={15} />Import</button><button className="share-button" onClick={() => { setShowShare(true); setShareCopied(false); }}><Icon name="share-2" size={15} />Share</button><input ref={fileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={importJson} /></div></div><div className="dock-tabs" role="tablist">{["Board", "Notes", "Bookmarks", "References"].map((tab) => <button key={tab} className={dockTab === tab ? "is-active" : ""} onClick={() => { setDockTab(tab); setActiveNav(tab === "Board" ? "Board" : tab); }}><Icon name={tab === "Board" ? "pen-line" : tab === "Notes" ? "notebook-pen" : tab === "Bookmarks" ? "bookmark" : "library"} size={15} />{tab}</button>)}<span className="autosave"><Icon name="cloud" size={15} />Auto-saved locally</span></div>{dockTab === "Board" ? <div className="dock-content board-content"><div className="board-paper"><div className="board-paper-label">Freeform derivation / scratch work</div><div className="board-equation-title">From Lagrangian to Eulerian</div><textarea className="board-editor" value={boardText} onChange={(event) => setBoardText(event.target.value)} aria-label="Board notes" /><SketchCanvas strokes={boardStrokes} setStrokes={(next) => { setBoardStrokes(next); setBoardRedo([]); }} activeTool={activeTool} label="Draw on the derivation board" className="board-sketch" /></div><div className="board-side-note"><div className="mini-heading">Linked note</div><strong>{selectedNote?.title}</strong><p>{selectedNote?.body}</p><small>{selectedNote?.source}</small><button onClick={() => { setDockTab("Notes"); setActiveNav("Notes"); }}>Open in Notes <Icon name="arrow-up-right" size={14} /></button></div></div> : null}{dockTab === "Notes" ? <div className="dock-content notes-content"><div className="notes-index"><div className="notes-index-head"><strong>My notes</strong><button onClick={addNote}><Icon name="plus" size={14} />New note</button></div>{notes.map((note) => <button key={note.id} className={`note-index-row ${selectedNoteId === note.id ? "selected" : ""}`} onClick={() => setSelectedNoteId(note.id)}><Icon name="file-text" size={15} /><span><strong>{note.title}</strong><small>{note.updated} · {note.source}</small></span></button>)}</div>{selectedNote ? <div className="note-editor"><input value={selectedNote.title} onChange={(event) => updateSelectedNote("title", event.target.value)} aria-label="Note title" /><textarea value={selectedNote.body} onChange={(event) => updateSelectedNote("body", event.target.value)} aria-label="Note body" /><div className="linked-source"><Icon name="link-2" size={14} />Linked to {selectedNote.source}</div></div> : null}</div> : null}{dockTab === "Bookmarks" ? <div className="dock-content resource-list"><div className="resource-heading">Saved study points</div><button className={`resource-row ${isBookmarked ? "selected" : ""}`} onClick={() => { setIsBookmarked(true); notify("Substantial derivative bookmarked"); }}><Icon name="bookmark" size={17} /><span><strong>Eulerian vs. Lagrangian formulations</strong><small>Section 2.1 · p. 5 · {isBookmarked ? "1 annotation" : "Ready to save"}</small></span><Icon name="arrow-up-right" size={15} /></button><button className="resource-row" onClick={() => notify("Continuity equation is in the next section")}><Icon name="bookmark" size={17} /><span><strong>Continuity equation</strong><small>Next lesson · p. 8</small></span><Icon name="arrow-up-right" size={15} /></button></div> : null}{dockTab === "References" ? <div className="dock-content resource-list"><div className="resource-heading">Source material</div><a className="resource-row selected" href={sourcePdfUrl} target="_blank" rel="noreferrer"><Icon name="file-text" size={17} /><span><strong>Notes_ATP_01_TransportEquations.pdf</strong><small>Professor source · 50 pages · first session</small></span><Icon name="arrow-up-right" size={15} /></a><div className="reference-footnote">Figures and equations in this lesson are grounded in the supplied lecture notes.</div></div> : null}</section>
    </div>
    {showShare ? <div className="modal-scrim" onClick={() => setShowShare(false)}><section className="share-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="share-modal-head"><div><div className="eyebrow">COLLABORATE</div><h2 id="share-title">Share this study workspace</h2><p>Package a portable copy that classmates can import without a server.</p></div><button className="modal-close" onClick={() => setShowShare(false)} aria-label="Close share dialog"><Icon name="x" size={18} /></button></div><div className="share-options"><label><input type="checkbox" checked={shareOptions.lecture} onChange={(event) => setShareOptions((current) => ({ ...current, lecture: event.target.checked }))} />Annotated lecture</label><label><input type="checkbox" checked={shareOptions.board} onChange={(event) => setShareOptions((current) => ({ ...current, board: event.target.checked }))} />Board and derivation</label><label><input type="checkbox" checked={shareOptions.notes} onChange={(event) => setShareOptions((current) => ({ ...current, notes: event.target.checked }))} />Notes and comments</label></div><div className="share-permission"><div><strong>Allow imports</strong><small>Others can add this package to their own lecture copy.</small></div><Toggle checked={allowImport} onChange={() => setAllowImport((value) => !value)} label="Allow imports" /></div><div className="share-link-row"><Icon name="link-2" size={16} /><span>{shareCopied ? "Link copied to clipboard" : `${shareOptions.lecture + shareOptions.board + shareOptions.notes} parts selected · link is portable`}</span><button onClick={copyShareLink}>{shareCopied ? "Copied" : "Copy link"}</button></div><div className="share-modal-footer"><button className="quiet-button" onClick={() => { exportJson(); setShowShare(false); }}>Download package</button><button className="accent-button" onClick={() => { copyShareLink(); setShowShare(false); }}>Share workspace <Icon name="arrow-up-right" size={15} /></button></div></section></div> : null}
    {toast ? <div className="toast"><Icon name="check-circle-2" size={16} />{toast}</div> : null}
  </div>;
}

export { App };
