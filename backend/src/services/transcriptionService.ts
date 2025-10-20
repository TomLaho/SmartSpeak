import axios from "axios";

const azureApiKey = process.env.AZURE_API_KEY;
const azureRegion = process.env.AZURE_REGION;

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (!buffer.length) {
    throw new Error("Empty audio buffer");
  }

  if (!azureApiKey || !azureRegion) {
    return "This is a sample transcript generated for development when Azure credentials are missing.";
  }

  const endpoint = `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;

  try {
    const response = await axios.post(endpoint, buffer, {
      headers: {
        "Ocp-Apim-Subscription-Key": azureApiKey,
        "Content-Type": mimeType || "audio/wav",
        Accept: "application/json",
        "Transfer-Encoding": "chunked",
      },
      maxBodyLength: Infinity,
    });

    if (response.data?.DisplayText) {
      return response.data.DisplayText as string;
    }

    if (typeof response.data === "string") {
      return response.data;
    }

    throw new Error("Azure Speech returned no transcript");
  } catch (error) {
    console.error("Azure transcription failed", error);
    return "Unable to transcribe audio. Please try again.";
  }
}
