// BastionGPT API integration
interface ChatMessage {
  role: string;
  content: string;
}

interface BastionGPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finishReason: string;
  }>;
  id: string;
  created: number;
  usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  };
}

class BastionGPTService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_BASTION_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || '';
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: 500,
          temperature: 0.7,
          function: 'veterans_claims_assistant'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BastionGPTResponse = await response.json();
      return data.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';
    } catch (error) {
      console.error('BastionGPT API error:', error);
      return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
    }
  }

  async generateClaimStatement(veteranData: any): Promise<string> {
    const systemPrompt = {
      role: 'system',
      content: `You are a VA claims assistant helping veterans create professional disability claim statements. Generate a comprehensive VA Form 21-4138 statement based on the veteran's information. Be empathetic, professional, and thorough. Focus on service connection and current impact on daily life.
      
      IMPORTANT: Do NOT include signature lines, date fields, or any signature sections in the statement as these will be handled by DocuSeal electronic signing. End the statement with a professional closing like "Thank you for your consideration of my claim." but absolutely no signature or date sections.`
    };

    const userPrompt = {
      role: 'user',
      content: `Please generate a professional VA disability claim statement for the following veteran:
      
      Name: ${veteranData.firstName} ${veteranData.lastName}
      Service: ${veteranData.militaryService?.branch} (${veteranData.militaryService?.serviceYears})
      Rank: ${veteranData.militaryService?.rank}
      Primary Condition: ${veteranData.claimInfo?.primaryCondition}
      Service Connection: ${veteranData.claimInfo?.serviceConnection}
      Current Symptoms: ${veteranData.claimInfo?.symptoms}
      Impact on Work/Daily Life: ${veteranData.claimInfo?.workImpact}
      Medical Treatment: ${veteranData.claimInfo?.medicalTreatment}
      
      Format this as a formal VA Form 21-4138 Statement in Support of Claim. Do not include signature or date sections as these will be added electronically.`
    };

    return await this.sendMessage([systemPrompt, userPrompt]);
  }
}

export const bastionGPT = new BastionGPTService();