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