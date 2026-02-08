// Centralized voice/help command lists used by VoiceAssistant and UI

export const HELP_COMMANDS = [
  'Go to dashboard',
  'Go to new courses',
  'Go to courses history',
  'Open a subject by saying the subject name, for example, English',
  'Start lesson followed by the lesson name, for example start lesson numbers',
  'On courses history page, say view followed by lesson name, for example view be the best',
  'Back to subjects',
  'Take quiz when you are in a lesson',
  'Show full transcript or hide transcript when watching a lesson',
  'Say option followed by a number to select an option, for example option two',
  'Next question to move to the next question',
  'Submit quiz to submit your quiz',
  'Go to profile',
  'Go to settings',
  'Say stop listening to stop voice control, or start listening to activate it again',
  'Say help to hear these commands again'
];

// Navigation keywords - flexible matching for navbar elements
// Users can say "dashboard", "go to dashboard", "open dashboard", etc.
export const NAVIGATION_KEYWORDS = {
  dashboard: ['dashboard', 'dash', 'home'],
  profile: ['profile', 'my profile', 'account'],
  'new-courses': ['new courses', 'courses', 'lessons', 'subjects'],
  'courses-history': ['courses history', 'course history', 'history'],
  'quizzes-history': ['quizzes history', 'quiz history'],
  settings: ['settings', 'setting', 'preferences'],
  quizzes: ['quizzes', 'quiz', 'test', 'tests']
};

// Theme keywords - flexible matching for dark/light mode
// Users can say "dark", "dark mode", "switch to dark", etc.
export const THEME_KEYWORDS = {
  dark: ['dark', 'dark mode', 'night mode', 'black'],
  light: ['light', 'light mode', 'day mode', 'white', 'bright']
};

// Font size keywords - flexible matching for font sizes
// Users can say "small", "font size small", "make it small", etc.
export const FONT_SIZE_KEYWORDS = {
  small: ['small', 'tiny', 'little'],
  medium: ['medium', 'normal', 'regular', 'default'],
  large: ['large', 'big', 'huge', 'bigger']
};

// Commands per page. Keys are normalized page identifiers used in voice and UI.
export const PAGES_COMMANDS = {
  dashboard: [
    'Go to dashboard',
    'Go to profile',
    'Open new courses',
    'Open quizzes',
    'Open settings',
    'Say help to hear global commands'
  ],
  'new-courses': [
    'Select a subject by saying its name, for example, English',
    'Start lesson followed by the lesson name, for example start lesson numbers',
    'Back to subjects'
  ],
  'courses-history': [
    'Say view followed by the lesson name to open a lesson, for example view be the best',
    'Go to new courses to browse more lessons',
    'Go to dashboard to return home'
  ],
  course: [
    'Start lesson',
    'Take quiz to open lesson quiz',
    'Show full transcript or hide transcript to control transcript visibility',
    'Back to subjects'
  ],
  quiz: [
    'Say option followed by a number to select an option, for example option two, or choose three',
    'Next question to move to the next question',
    'Submit quiz to submit your quiz'
  ],
  profile: [
    'Open profile',
    'Edit profile details'
  ],
  settings: [
    'Switch to dark mode or light mode by saying dark or light',
    'Set font size: say font size small, medium, or large'
  ]
};