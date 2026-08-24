import "./logger";
import ollama from "ollama";

export async function askOllama(prompt: string) {
  try {
  const response = await ollama.chat({
    model: "llama3.2:3b", // replace with your model name
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  return response.message.content;
 } catch (error) {
  console.error("Error communicating with Ollama:", error);
  return "Sorry, I couldn't get a response from the model.";
 }

}

export async function streamOllama(
  prompt: string,
  onChunk: (chunk: string) => void,
) {
  try {
    const response = await ollama.chat({
      model: "llama3.2:3b",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let content = "";
    for await (const part of response) {
      const chunk = part.message.content;
      if (!chunk) continue;
      content += chunk;
      onChunk(chunk);
    }
    return content;
  } catch (error) {
    console.error("Error streaming from Ollama:", error);
    return "Sorry, I couldn't get a response from the model.";
  }
}
