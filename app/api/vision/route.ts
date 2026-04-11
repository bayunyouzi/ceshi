import { NextResponse } from 'next/server';
import { parseApiError, logErrorAsync, buildErrorResponse, ErrorCode } from '@/lib/errorHandler';

const API_KEY = process.env.VISION_API_KEY || "sk-w7Eit87AWrFGwLYLrIcSOgdDW204j0euC2Zlg5DACz4xx7nT";
const API_ENDPOINT = process.env.VISION_API_ENDPOINT || "https://happyapi.org/v1/chat/completions";
const VISION_MODEL = process.env.VISION_MODEL || "grok-4.20-0309-non-reasoning";

export async function POST(req: Request) {
  try {
    const { image, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert AI art prompter. Your task is to analyze the provided image and generate a high-quality, detailed text prompt based on the user's instruction.
    
    User Instruction: ${prompt}
    
    Output Format:
    Strictly output ONLY the prompt text. Do not include "Here is the prompt" or any other conversational text.
    The prompt should be in English, comma-separated tags or sentences, suitable for AI image generation.`;

    const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and generate the prompt." },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = parseApiError(response.status, errorText);
      logErrorAsync(error, { model: VISION_MODEL, endpoint: API_ENDPOINT });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return NextResponse.json({ prompt: content });

  } catch (error: any) {
    const err = buildErrorResponse(
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      error instanceof Error ? error.message : String(error)
    );
    logErrorAsync(err, {});
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
}
