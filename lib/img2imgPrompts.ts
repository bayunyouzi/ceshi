export const img2ImgPrompts: Record<string, string> = {
  figure: `Your primary mission is to convert the subject from the user's photo into a **photorealistic, ultra-high-resolution miniature model**, displayed in a realistic studio/workshop setting. The result must be **pin-sharp, crystal clear, and professional-grade**, with **no blur, no distortion, and no random changes in pose**.

**Core Directive: Subject Analysis & Priority Assignment (CRITICAL FIRST STEP)**
1. Identify the subject of the image.
2. Apply the correct rule set:

* **RULE SET A - Person, creature, or animal:**
   - **If a face is visible:** Prioritize **Character Fidelity and Sharp Likeness**.
   - **If NO face is visible (e.g., back view):** Prioritize **Pose and Form Fidelity**.
     ⚠️ **Do NOT invent or fabricate a face**. Preserve the exact pose of the subject in the input photo.

* **RULE SET B - Vehicle:** Ensure perfect **Form, Proportions, Surface Finish, and Key Details** with **ultra-sharp clarity**.

* **RULE SET C - Building/structure:** Ensure **Architectural Integrity** with clear **geometry, materials, and fine details**, all rendered in **sharp focus**.

**Scene Composition (Strictly follow these details):**
1. **The Model:** The miniature model on a desk or workshop table, rendered in **ultra-sharp detail**, faithfully matching the input subject's **pose and proportions**.
2. **Computer Monitor:** In the background, a monitor displays relevant 3D modeling software, showing the same subject. The screen must be **readable, crisp, not blurry**.
3. **Environment:** A realistic, well-lit studio or office desk, with details like tools or keyboards, rendered in **professional product photography clarity**.`,

  figure_box: `Your primary mission is to convert the subject from the user's photo into a **photorealistic, ultra-high-resolution miniature figure**, presented in its commercial packaging.
The result must be **sharp, crystal-clear, and professional product photography quality**, with **no blurriness or distortion**.

**Core Directive: Subject Analysis & Priority Assignment (CRITICAL FIRST STEP)**
1. Identify the subject of the image.
2. Apply the correct rule set:

* **RULE SET A - Person, creature, or animal:**
   - **If a face is visible:** Your top priority is **Likeness**. Render the face in sharp detail, with accurate proportions.
   - **If NO face is visible (e.g., back view):** Your top priority is **Pose and Form Fidelity**. **Do NOT invent or add a face** ⁃ faithfully preserve the back-view pose from the source photo.

* **RULE SET B - Vehicle:** Prioritize exact **Form, Proportions, Surface Finish, and Key Details**.

* **RULE SET C - Building/structure:** Prioritize **Architectural Integrity** (geometry, materials, fine details).

**Scene Details:**
1. **The Model:** The miniature figure must be **highly detailed, sharp, and exactly match the pose from the input photo**.
2. **The Base:** A clean, simple display base.
3. **The Packaging:** Behind the model, show a collector's style box featuring the subject.
4. **Environment:** A professional, well-lit indoor studio setting, **sharp focus, no blur, no noise**.`,

  cosplay: `Generate a highly detailed photo of a human cosplaying this illustration, at Comiket. Exactly replicate the same pose, body posture, hand gestures, facial expression, and camera framing as in the original illustration. Keep the same angle, perspective, and composition, without any deviation`,

  cosplay_selfie: `Create a cosplay selfie version from the reference character. Keep identity locked: same face traits, hair, outfit and colors. Front camera selfie composition, arm-length perspective, realistic skin texture, indoor ambient light, slight phone camera grain, high detail. Return image only.`,

  real: `Convert the reference character to an ultra-realistic, highly detailed photorealistic style while strictly preserving identity. Keep the exact same face geometry, same hairstyle, same costume details, same pose and camera framing as the original image. Realistic skin texture, natural lighting, subtle film grain, sharp and believable, no cartoon style. DO NOT change the subject's pose or clothing.`,

  anime: `Redraw the reference image into clean 2D anime style while strictly preserving identity and composition. Keep exact same face shape, same eye style, same hairstyle, same costume pattern and color, same pose and camera angle. Crisp lineart, cel shading, vibrant but controlled colors, masterpiece, high detail. DO NOT change the subject's pose or clothing.`,

  chibi: `Convert the reference character into chibi style. Keep recognizable identity cues: hairstyle, eye color, costume palette, signature accessories. 1:2 head-to-body ratio, cute proportions, clean lines, soft shading, simple background, high clarity. Return image only.`,

  sticker: `Convert the reference character into a sticker illustration. Keep identity locked and outfit recognizable. Bold clean outline, transparent or simple plain background, centered composition, high contrast colors, printable quality. Return image only.`,

  first_person: `Generate a first-person perspective scene featuring the reference character. Keep the character identity, face traits, hairstyle and outfit consistent with reference. Cinematic POV composition, realistic depth and lighting, high detail. Return image only.`,

  turnaround: `Create a three-view turnaround of the reference character (front, side, back) in one image. Keep identity and costume details fully consistent across all three views. Clean neutral background, design-sheet style, high detail, no text. Return image only.`,

  storyboard: `Create a 4-panel storyboard based on the reference character. Keep identity, outfit and hairstyle consistent in every panel. Panels should show coherent action progression with varied camera shots. Clean comic layout, no text bubbles, high detail. Return image only.`,

  random: `Generate a new creative image based on the reference while preserving core identity: same face features, hairstyle, outfit style and color family. Allow creative scene and lighting variation, but keep character recognizability high. Return image only.`,
};

export const img2ImgEffectOptions = [
  { id: 'figure', label: '手办化' }, { id: 'figure_box', label: '盒装手办' },
  { id: 'cosplay', label: 'COS化' }, { id: 'cosplay_selfie', label: 'COS自拍' },
  { id: 'real', label: '真人化' }, { id: 'anime', label: '动漫化' },
  { id: 'chibi', label: 'Q版化' }, { id: 'sticker', label: '贴纸化' },
  { id: 'first_person', label: '第一视角' }, { id: 'turnaround', label: '三视图' },
  { id: 'storyboard', label: '分镜化' }, { id: 'random', label: '随机变异' },
];
