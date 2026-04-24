"use client";

import { useMemo, useState } from "react";

type WorkflowKey =
  | "chainSwap"
  | "pendantResize"
  | "ringReplace"
  | "ringStack"
  | "engraving"
  | "fullNecklace"
  | "chainType"
  | "productPhoto"
  | "video"
  | "custom";

type OutputMode = "chatgpt" | "midjourney" | "runway" | "pika";

type Preset = {
  label: string;
  emoji: string;
  task: string;
  area: string;
  source: string;
  hint: string;
};

const workflows: Record<WorkflowKey, Preset> = {
  chainSwap: {
    label: "Chain swap",
    emoji: "🔗",
    task: "Replace the chain in the left image with the chain from the right image.",
    area: "Necklace chain only",
    source: "Use the chain from the right image as the exact reference.",
    hint: "Change only the chain, not the pendant."
  },
  pendantResize: {
    label: "Pendant resize",
    emoji: "💎",
    task: "Resize the pendant to the selected scale.",
    area: "Pendant only",
    source: "Use the existing pendant as the exact reference.",
    hint: "Make pendant smaller/larger without redesign."
  },
  ringReplace: {
    label: "Ring replace",
    emoji: "💍",
    task: "Replace the ring in the left image with the ring from the right image.",
    area: "Ring on finger",
    source: "Use the ring from the right image as the exact reference.",
    hint: "Swap one ring onto a finger."
  },
  ringStack: {
    label: "Stack rings",
    emoji: "✨",
    task: "Add the ring from the right image onto the same finger in the left image, stacking it with the existing ring.",
    area: "Ring stack on finger",
    source: "Use the right image ring as the added ring reference.",
    hint: "Stack two rings naturally."
  },
  engraving: {
    label: "Engraving",
    emoji: "✍️",
    task: "Add realistic laser engraving to the selected jewelry surface.",
    area: "Top band of the ring",
    source: "Follow the existing metal material, curvature, lighting, and perspective.",
    hint: "Laser text for ring or pendant."
  },
  fullNecklace: {
    label: "Full necklace transfer",
    emoji: "📿",
    task: "Extract the necklace from the right image and composite it onto the subject in the left image.",
    area: "Full necklace",
    source: "Use the necklace from the right image as a fixed asset.",
    hint: "Place full necklace onto model."
  },
  chainType: {
    label: "Change chain type",
    emoji: "⚙️",
    task: "Replace the existing chain with a new chain type.",
    area: "Chain only",
    source: "Use realistic jewelry construction while preserving the pendant unchanged.",
    hint: "Box, cable, rope, snake, paperclip."
  },
  productPhoto: {
    label: "Product photo",
    emoji: "📸",
    task: "Create a premium product photography image using the product from the reference image.",
    area: "Full product",
    source: "Use the uploaded product image as the exact product reference.",
    hint: "Generate clean product ads."
  },
  video: {
    label: "Product video",
    emoji: "🎬",
    task: "Create a cinematic jewelry product video using the reference product image.",
    area: "Product focus area",
    source: "Use the uploaded product image as the exact product reference.",
    hint: "Runway/Pika/Kling/Sora style prompts."
  },
  custom: {
    label: "Custom",
    emoji: "🧩",
    task: "Perform the custom jewelry edit described below.",
    area: "User-specified area",
    source: "Use the provided reference image(s) exactly as specified.",
    hint: "Build your own prompt."
  }
};

const chainOptions = [
  "1.8mm round box chain in silver",
  "1.8mm round box chain in gold",
  "2mm cable chain in silver",
  "2mm cable chain in gold",
  "thin snake chain in silver",
  "thin rope chain in gold",
  "2mm paperclip chain in silver",
  "custom"
];

const aspectOptions = ["1:1 square", "4:5 portrait", "9:16 vertical", "16:9 landscape"];

const videoMotionOptions = [
  "slow camera push-in",
  "subtle side-to-side camera slide",
  "soft handheld micro movement",
  "slow focus reveal from blurred to sharp",
  "gentle model breathing and slight head turn",
  "macro orbit around the product"
];

function cx(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function buildPrompt(params: {
  workflow: WorkflowKey;
  outputMode: OutputMode;
  customTask: string;
  engravingText: string;
  scale: string;
  chainType: string;
  customChainType: string;
  placement: string;
  lighting: string;
  background: string;
  aspectRatio: string;
  videoMotion: string;
  extra: string;
  strictness: number;
  includeNegative: boolean;
}) {
  const selected = workflows[params.workflow] || workflows.chainSwap;
  const chain = params.chainType === "custom" ? params.customChainType : params.chainType;
  let task = params.customTask.trim() || selected.task;

  if (!params.customTask.trim() && params.workflow === "pendantResize") {
    task = `Resize the pendant to ${params.scale}. Select and transform the pendant only.`;
  }

  if (!params.customTask.trim() && params.workflow === "engraving") {
    task = `Add the engraving "${params.engravingText}" to the top band of the ring. Make it look like realistic laser engraving: subtle, crisp, shallow, slightly indented into the metal, not printed, not painted, and not raised.`;
  }

  if (!params.customTask.trim() && params.workflow === "chainType") {
    task = `Replace the existing chain with a ${chain}. Modify only the chain.`;
  }

  if (!params.customTask.trim() && params.workflow === "productPhoto") {
    task = "Create a premium jewelry product photography image using the product from the reference image. The product must remain identical to the reference.";
  }

  if (!params.customTask.trim() && params.workflow === "video") {
    task = "Create a cinematic jewelry product video using the product from the reference image. The product must remain identical to the reference image.";
  }

  const strictLines = [
    "Do not redesign, recreate, redraw, simplify, enhance, or reinterpret any part of the jewelry.",
    "Preserve original details, proportions, textures, geometry, materials, and construction exactly.",
    "Apply changes only to the specified target area.",
    "Treat the jewelry/product as a fixed reference asset.",
    "If exact preservation is not possible, do not modify the product design."
  ];

  if (params.strictness >= 2) {
    strictLines.push("Maintain exact chain pattern, pendant shape, ring face, engraving placement, threading, clasp position, alignment, and spacing where applicable.");
  }

  if (params.strictness >= 3) {
    strictLines.push("Use direct compositing/editing behavior, not generative redesign. The product must stay pixel-faithful to the reference wherever possible.");
  }

  const realismLines = [
    `Lighting style: ${params.lighting}.`,
    `Background/environment: ${params.background}.`,
    `Placement/alignment: ${params.placement}.`,
    "Match lighting direction, reflections, shadows, highlights, skin tone, perspective, and depth of field.",
    "Make the jewelry sit naturally with realistic weight, contact, curvature, tension, gravity, and scale."
  ];

  const negative = params.includeNegative
    ? `
NEGATIVE INSTRUCTIONS:
- No warped jewelry
- No wrong chain pattern
- No changed pendant design
- No fake-looking reflections
- No floating product
- No extra jewelry unless requested
- No melted metal, distorted text, blurry product, or incorrect engraving
- No changes outside the requested area
`
    : "";

  if (params.outputMode === "midjourney") {
    return `${task}

Use the provided image as the exact jewelry reference. Preserve the product design exactly.
${realismLines.join(" ")}
Clean luxury jewelry campaign, premium product photography, high-end realistic finish, ${params.aspectRatio}.

Do not alter jewelry design, pendant, chain pattern, ring face, or engraving details.
--style raw --v 6.1`;
  }

  if (params.outputMode === "runway" || params.outputMode === "pika") {
    return `Create a short cinematic jewelry video from the reference image.

TASK:
${task}

CAMERA / MOTION:
- ${params.videoMotion}
- Smooth, slow, premium movement
- Keep the jewelry sharp and in focus

PRODUCT LOCK:
- ${strictLines.join("\n- ")}

VISUAL STYLE:
- ${realismLines.join("\n- ")}
- Aspect ratio: ${params.aspectRatio}

OUTPUT:
Luxury jewelry ad, realistic product motion, clean premium look, no product redesign.${negative}`;
  }

  return `Perform a strict image edit using the provided reference image(s).

TASK:
${task}

TARGET AREA:
${selected.area}

SOURCE / REFERENCE:
${selected.source}

CONSTRAINTS:
- ${strictLines.join("\n- ")}

PRODUCT ACCURACY:
- Preserve exact chain pattern, pendant details, ring face, engraving placement, and jewelry structure where applicable.
- Maintain correct chain-to-pendant connection, threading, alignment, entry/exit points, and spacing where applicable.
- Do not simplify, smooth, enhance, distort, or change the product design.

REALISM:
- ${realismLines.join("\n- ")}

OUTPUT:
- Clean, realistic, professional high-end jewelry product result.
- Aspect ratio: ${params.aspectRatio}.
- No artifacts, warped jewelry, incorrect reflections, or unwanted changes.${negative}
EXTRA NOTE:
${params.extra}`;
}

function scorePrompt(prompt: string) {
  const checks = [
    { label: "Has strict product preservation", pass: /preserve|fixed reference|pixel-faithful/i.test(prompt) },
    { label: "Forbids redesign", pass: /do not redesign|no product redesign|do not alter/i.test(prompt) },
    { label: "Includes lighting/shadows", pass: /lighting|reflections|shadows/i.test(prompt) },
    { label: "Includes target/task", pass: /TASK:/i.test(prompt) },
    { label: "Includes realistic placement", pass: /gravity|contact|placement|alignment/i.test(prompt) }
  ];

  const points = checks.filter((c) => c.pass).length;
  return { checks, score: Math.round((points / checks.length) * 100) };
}

export default function JewelryPromptStudio() {
  const [workflow, setWorkflow] = useState<WorkflowKey>("chainSwap");
  const [outputMode, setOutputMode] = useState<OutputMode>("chatgpt");
  const [customTask, setCustomTask] = useState("");
  const [engravingText, setEngravingText] = useState("I am enough");
  const [scale, setScale] = useState("70% of its current size / 30% smaller");
  const [chainType, setChainType] = useState("1.8mm round box chain in silver");
  const [customChainType, setCustomChainType] = useState("2mm paperclip chain in silver");
  const [placement, setPlacement] = useState("natural centered placement, snug fit, correct alignment");
  const [lighting, setLighting] = useState("soft diffused studio lighting with realistic metal reflections");
  const [background, setBackground] = useState("clean neutral luxury product-photo background");
  const [aspectRatio, setAspectRatio] = useState("1:1 square");
  const [videoMotion, setVideoMotion] = useState("slow camera push-in");
  const [extra, setExtra] = useState("Ensure the final result looks like a clean, high-end jewelry product edit.");
  const [strictness, setStrictness] = useState(3);
  const [includeNegative, setIncludeNegative] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageName, setImageName] = useState("No image selected");

  const prompt = useMemo(
    () =>
      buildPrompt({
        workflow,
        outputMode,
        customTask,
        engravingText,
        scale,
        chainType,
        customChainType,
        placement,
        lighting,
        background,
        aspectRatio,
        videoMotion,
        extra,
        strictness,
        includeNegative
      }),
    [
      workflow,
      outputMode,
      customTask,
      engravingText,
      scale,
      chainType,
      customChainType,
      placement,
      lighting,
      background,
      aspectRatio,
      videoMotion,
      extra,
      strictness,
      includeNegative
    ]
  );

  const quality = useMemo(() => scorePrompt(prompt), [prompt]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const area = document.createElement("textarea");
      area.value = prompt;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  function savePrompt() {
    setSavedPrompts((prev) => [prompt, ...prev].slice(0, 8));
  }

  function downloadPrompt() {
    const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jewelry-prompt-${workflow}-${outputMode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function onImageChange(file?: File) {
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function resetAll() {
    setWorkflow("chainSwap");
    setOutputMode("chatgpt");
    setCustomTask("");
    setEngravingText("I am enough");
    setScale("70% of its current size / 30% smaller");
    setChainType("1.8mm round box chain in silver");
    setCustomChainType("2mm paperclip chain in silver");
    setPlacement("natural centered placement, snug fit, correct alignment");
    setLighting("soft diffused studio lighting with realistic metal reflections");
    setBackground("clean neutral luxury product-photo background");
    setAspectRatio("1:1 square");
    setVideoMotion("slow camera push-in");
    setExtra("Ensure the final result looks like a clean, high-end jewelry product edit.");
    setStrictness(3);
    setIncludeNegative(true);
    setImagePreview("");
    setImageName("No image selected");
  }

  return (
    <main className="app">
      <div className="shell">
        <section className="hero">
          <div>
            <span className="badge">✦ SaaS prompt studio</span>
            <h1>Jewelry Prompt Studio</h1>
            <p>
              A production-ready prompt generator for jewelry image edits and AI video tools.
              Build strict, product-safe prompts for chain swaps, pendant resizing, engraving,
              ring stacking, product photos, and cinematic product videos.
            </p>
          </div>

          <aside className="hero-panel">
            <div>
              <div style={{ fontSize: 44 }}>{workflows[workflow].emoji}</div>
              <h2 style={{ margin: "8px 0 6px", fontSize: 28 }}>{workflows[workflow].label}</h2>
              <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>{workflows[workflow].hint}</p>
            </div>

            <div className="stat-grid">
              <div className="stat">
                <strong>{quality.score}%</strong>
                <span>Prompt score</span>
              </div>
              <div className="stat">
                <strong>{strictness}/3</strong>
                <span>Strictness</span>
              </div>
            </div>
          </aside>
        </section>

        <nav className="tabs">
          {(["chatgpt", "midjourney", "runway", "pika"] as OutputMode[]).map((mode) => (
            <button
              key={mode}
              className={cx("tab", outputMode === mode && "active")}
              onClick={() => setOutputMode(mode)}
            >
              {mode === "chatgpt" ? "ChatGPT Image" : mode.toUpperCase()}
            </button>
          ))}
        </nav>

        <section className="layout">
          <div>
            <div className="card">
              <h2>1. Choose workflow</h2>
              <div className="grid2">
                {Object.entries(workflows).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => setWorkflow(key as WorkflowKey)}
                    className={cx("chip workflow", workflow === key && "active")}
                  >
                    <span>{item.emoji}</span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>2. Reference image</h2>
              <div className="upload">
                <input type="file" accept="image/*" onChange={(e) => onImageChange(e.target.files?.[0])} />
                <p className="hint">
                  Selected: {imageName}. This app previews locally only. Upload the actual product image into your AI tool with the generated prompt.
                </p>
                <div className="upload-preview">
                  {imagePreview ? <img src={imagePreview} alt="Reference preview" /> : <span className="hint">Image preview</span>}
                </div>
              </div>
            </div>

            <div className="card">
              <h2>3. Product settings</h2>

              {workflow === "pendantResize" && (
                <Field label="Pendant size" value={scale} onChange={setScale} placeholder="70% of current size / 30% smaller" />
              )}

              {workflow === "engraving" && (
                <Field label="Engraving text" value={engravingText} onChange={setEngravingText} placeholder="I am enough" />
              )}

              {workflow === "chainType" && (
                <div className="field">
                  <label>Chain type</label>
                  <select className="select" value={chainType} onChange={(e) => setChainType(e.target.value)}>
                    {chainOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {chainType === "custom" && (
                    <div style={{ marginTop: 12 }}>
                      <Field label="Custom chain type" value={customChainType} onChange={setCustomChainType} placeholder="2mm paperclip chain in silver" />
                    </div>
                  )}
                </div>
              )}

              <Field label="Placement / alignment" value={placement} onChange={setPlacement} />
              <Field label="Lighting" value={lighting} onChange={setLighting} />
              <Field label="Background" value={background} onChange={setBackground} />

              <div className="field">
                <label>Aspect ratio</label>
                <select className="select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                  {aspectOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              {(outputMode === "runway" || outputMode === "pika" || workflow === "video") && (
                <div className="field">
                  <label>Video motion</label>
                  <select className="select" value={videoMotion} onChange={(e) => setVideoMotion(e.target.value)}>
                    {videoMotionOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field">
                <label>Custom task override</label>
                <textarea
                  className="textarea"
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="Example: Increase the chain thickness by 20% only."
                />
              </div>

              <div className="field">
                <label>Extra note</label>
                <textarea className="textarea" value={extra} onChange={(e) => setExtra(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <h2>4. Accuracy controls</h2>
              <div className="field">
                <label>Strictness level: {strictness}</label>
                <input className="range" type="range" min={1} max={3} value={strictness} onChange={(e) => setStrictness(Number(e.target.value))} />
              </div>

              <label className="switch-row">
                <span>
                  <strong>Negative instructions</strong>
                  <br />
                  <small className="hint">Helps prevent warped jewelry, fake reflections, and design changes.</small>
                </span>
                <input type="checkbox" checked={includeNegative} onChange={(e) => setIncludeNegative(e.target.checked)} />
              </label>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="prompt-toolbar">
                <h2 style={{ margin: 0 }}>Generated prompt</h2>
                <div className="actions">
                  <button className="btn primary" onClick={copyPrompt}>{copied ? "Copied ✓" : "Copy"}</button>
                  <button className="btn gold" onClick={savePrompt}>Save</button>
                  <button className="btn" onClick={downloadPrompt}>Download .txt</button>
                  <button className="btn danger" onClick={resetAll}>Reset</button>
                </div>
              </div>

              <textarea className="prompt" readOnly value={prompt} />
            </div>

            <div className="card">
              <h2>Prompt quality</h2>
              <div className="score-box">
                <div className="score-ring" style={{ ["--deg" as any]: `${quality.score * 3.6}deg` }}>
                  <strong>{quality.score}%</strong>
                </div>
                <div className="checklist">
                  {quality.checks.map((check) => (
                    <div key={check.label} className={cx("check", check.pass && "pass")}>
                      <span>{check.pass ? "✓" : "•"}</span>
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="row">
                <h2 style={{ margin: 0 }}>Saved prompts</h2>
                {savedPrompts.length > 0 && (
                  <button className="btn danger" onClick={() => setSavedPrompts([])}>Clear</button>
                )}
              </div>

              {savedPrompts.length === 0 ? (
                <p className="hint">No saved prompts yet.</p>
              ) : (
                <div className="saved-list">
                  {savedPrompts.map((saved, index) => (
                    <details className="saved-item" key={`${saved.slice(0, 40)}-${index}`}>
                      <summary>Saved prompt #{index + 1}</summary>
                      <pre>{saved}</pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <p className="footer-note">
          Built for jewelry editing workflows. Product image previews are local only; no upload or backend included.
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
