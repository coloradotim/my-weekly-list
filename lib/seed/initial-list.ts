export type InitialActivitySeed = {
  name: string;
  target: number;
};

export type InitialCategorySeed = {
  name: string;
  activities: InitialActivitySeed[];
};

export const initialWeeklyListSeed: InitialCategorySeed[] = [
  {
    name: "Physical Health",
    activities: [
      { name: "Walk", target: 4 },
      { name: "Floss", target: 4 },
      { name: "Yoga", target: 2 },
      { name: "Cardio / Strength", target: 2 },
    ],
  },
  {
    name: "Mental Health",
    activities: [
      { name: "Weekly calendar", target: 1 },
      { name: "Friends", target: 1 },
      { name: "Journal", target: 1 },
      { name: "Pivot Year", target: 7 },
      { name: "Meditation", target: 3 },
      { name: "Downtime", target: 2 },
      { name: "Read", target: 5 },
      { name: "Get out of the house", target: 3 },
    ],
  },
  {
    name: "Family and Home",
    activities: [
      { name: "Quality kid time", target: 1 },
      { name: "Check budget", target: 2 },
      { name: "House upkeep", target: 2 },
    ],
  },
  {
    name: "Relationship Health",
    activities: [
      { name: "Video call", target: 5 },
      { name: "Check in", target: 1 },
      { name: "Fun sexy times", target: 1 },
    ],
  },
  {
    name: "Hobbies",
    activities: [
      { name: "Singing practice", target: 4 },
      { name: "Dance", target: 1 },
      { name: "Pickleball", target: 1 },
      { name: "Harmony Road work", target: 1 },
    ],
  },
  {
    name: "Work",
    activities: [
      { name: "Update whiteboard", target: 3 },
      { name: "Complete a big item", target: 1 },
    ],
  },
];
