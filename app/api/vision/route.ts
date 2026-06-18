import { NextResponse } from 'next/server';
import { parseApiError, logErrorAsync, buildErrorResponse, ErrorCode } from '@/lib/errorHandler';
import { getConfig } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const { image, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const apiKey = await getConfig('VISION_API_KEY');
    const apiEndpoint = await getConfig('VISION_API_ENDPOINT');
    const visionModel = await getConfig('VISION_MODEL');

    const systemPrompt = `You are an expert AI art prompter. Your task is to analyze the provided image and generate a high-quality, detailed text prompt based on the user's instruction.
    
    User Instruction: ${prompt}
    
    Output Format:
    Strictly output ONLY the prompt text. Do not include "Here is the prompt" or any other conversational text.
    The prompt should be in English, comma-separated tags or sentences, suitable for AI image generation.`;

    const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: visionModel,
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
      logErrorAsync(error, { model: visionModel, endpoint: apiEndpoint });
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
