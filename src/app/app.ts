import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// =====================================================================
// 🔑 YOUR GEMINI API KEY
// =====================================================================
const GEMINI_API_KEY = 'AQ.Ab8RN6ItqsWKrYP7CYD5A41AIec8j-y0erDb_ebNfMO31Km0wQ';
// =====================================================================

interface Activity {
  time: string;
  title: string;
  description: string;
}

interface DayPlan {
  dayNumber: number;
  theme: string;
  activities: Activity[];
}

interface Itinerary {
  destination: string;
  tripLength: string;
  days: DayPlan[];
}

interface VibeOption {
  name: string;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  // State Signals
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  itinerary = signal<Itinerary | null>(null);
  copiedToast = signal<boolean>(false);

  // Form Inputs
  destination = signal<string>('');
  days = signal<number>(3);
  selectedVibe = signal<string>('Adventure & Outdoors');

  // Available Vibes with rich descriptions
  vibes: VibeOption[] = [
    { name: 'Adventure & Outdoors', icon: '🏕️', desc: 'Hiking, nature exploration, and adrenaline' },
    { name: 'Foodie & Culinary', icon: '🍜', desc: 'Street food, fine dining, and local markets' },
    { name: 'History & Culture', icon: '🏛️', desc: 'Museums, ancient temples, and heritage sites' },
    { name: 'Relaxing & Spa', icon: '🏖️', desc: 'Beaches, hot springs, and leisurely strolls' },
    { name: 'Nightlife & Party', icon: '🍸', desc: 'Rooftop bars, live music, and night markets' },
    { name: 'Hidden Gems', icon: '🗺️', desc: 'Off-the-beaten-path and local secrets' }
  ];

  // Plain object schema for Direct REST API call
  private itinerarySchema = {
    type: 'OBJECT',
    properties: {
      destination: { type: 'STRING' },
      tripLength: { type: 'STRING' },
      days: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            dayNumber: { type: 'INTEGER' },
            theme: { type: 'STRING' },
            activities: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  time: { type: 'STRING' },
                  title: { type: 'STRING' },
                  description: { type: 'STRING' }
                },
                required: ['time', 'title', 'description']
              }
            }
          },
          required: ['dayNumber', 'theme', 'activities']
        }
      }
    },
    required: ['destination', 'tripLength', 'days']
  };

  selectVibe(vibeName: string): void {
    this.selectedVibe.set(vibeName);
  }

  async generateItinerary(): Promise<void> {
    if (!GEMINI_API_KEY) {
      this.error.set('⚠️ Please verify your Gemini API Key in src/app/app.ts!');
      return;
    }

    if (!this.destination().trim()) {
      this.error.set('Please enter a destination to plan your trip.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.itinerary.set(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY.trim()}`;

      const prompt = `Create a highly detailed, realistic travel itinerary for ${this.days()} days in ${this.destination()}.
      The traveler's preferred vibe is: "${this.selectedVibe()}".
      Ensure activities logically flow by geographic location so the traveler isn't wasting time commuting back and forth.
      Include breakfast, morning activity, lunch, afternoon activity, dinner, and an evening plan for each day. Make descriptions engaging and vivid.`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: this.itinerarySchema
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      const parsedData: Itinerary = JSON.parse(responseText);

      this.itinerary.set(parsedData);
    } catch (err: any) {
      console.error('Gemini REST API Error:', err);
      this.error.set(`Failed to generate itinerary: ${err.message || 'Please verify your API key and try again.'}`);
    } finally {
      this.loading.set(false);
    }
  }

  copyToClipboard(): void {
    const data = this.itinerary();
    if (!data) return;

    let text = `# Travel Itinerary: ${data.destination} (${data.tripLength})\n`;
    text += `Vibe: ${this.selectedVibe()}\n\n`;

    data.days.forEach(day => {
      text += `--- Day ${day.dayNumber}: ${day.theme} ---\n`;
      day.activities.forEach(act => {
        text += `[${act.time}] ${act.title}: ${act.description}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      this.copiedToast.set(true);
      setTimeout(() => this.copiedToast.set(false), 3000);
    });
  }

  printItinerary(): void {
    window.print();
  }

  resetPlanner(): void {
    this.itinerary.set(null);
    this.destination.set('');
  }
}
