export interface GarminData {
  bodyBattery: number;
  sleepHours: number;
  stress: number;
  steps: number;
  heartRate: number;
  calories: number;
  connected: boolean;
}

export function getGarminData(): GarminData {
  return {
    bodyBattery: 72,
    sleepHours: 7.2,
    stress: 28,
    steps: 4350,
    heartRate: 62,
    calories: 1850,
    connected: false,
  };
}

export function getEnergySuggestion(data: GarminData): "high" | "medium" | "low" {
  if (data.bodyBattery >= 70 && data.stress < 40 && data.sleepHours >= 7) {
    return "high";
  }
  if (data.bodyBattery >= 40 && data.stress < 60) {
    return "medium";
  }
  return "low";
}
