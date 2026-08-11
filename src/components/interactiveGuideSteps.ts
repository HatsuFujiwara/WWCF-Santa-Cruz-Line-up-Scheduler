import { ActiveTab } from '../types';

export interface TourStep {
  id: number;
  sectionTitle: string;
  stepTitle: string;
  targetTab: ActiveTab;
  targetSelector: string;
  actionPrompt: string;
  actionType: 'click' | 'input' | 'none';
  description: string;
  bullets: string[];
  rule: string;
}

export const INTERACTIVE_GUIDE_STEPS: TourStep[] = [
  // BASIC LINEUP GUIDE (Steps 1–7)
  {
    id: 1,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Open / Create Line-up',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="header-new-lineup-btn"]',
    actionPrompt: 'Click "+ New Lineup" to start.',
    actionType: 'click',
    description: 'Start a new worship line-up draft set.',
    bullets: ['Initializes a new lineup draft for your upcoming service.'],
    rule: 'Step 1: Open or create a line-up.'
  },
  {
    id: 2,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Select Service Type',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="service-type-select"]',
    actionPrompt: 'Select your service type.',
    actionType: 'none',
    description: 'Choose Sunday Service, Midweek Prayer, or special worship service.',
    bullets: [
      'Select Sunday Service or Midweek Prayer Service.',
      'Automatically configures default song slots for the selected service.'
    ],
    rule: 'Step 2: Select service type.'
  },
  {
    id: 3,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Select Service Date',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="service-date-picker"]',
    actionPrompt: 'Select your service date.',
    actionType: 'none',
    description: 'Pick the scheduled date for this worship service.',
    bullets: [
      'Sunday Service defaults to the next available Sunday.',
      'Midweek Prayer Service defaults to Wednesday but allows date flexibility.'
    ],
    rule: 'Step 3: Select service date.'
  },
  {
    id: 4,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Choose How to Create Your Line-up',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="add-songs-section"]',
    actionPrompt: 'How would you like to add songs?',
    actionType: 'none',
    description: 'Select your preferred method for adding songs to this line-up.',
    bullets: [
      'Option A: Create Blank Line-up — add songs manually.',
      'Option B: Import YouTube Playlist — paste a YouTube or YouTube Music playlist URL.'
    ],
    rule: 'Step 4: Choose line-up creation method.'
  },
  {
    id: 41,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Step 4A: Add Songs to Line-up',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="add-songs-section"]',
    actionPrompt: 'Add songs to your line-up.',
    actionType: 'none',
    description: 'Search songs from database or select songs from catalog.',
    bullets: [
      'Type in the song input box to search existing songs with smart auto-complete.',
      'Click + Add Song slot if you need more song rows.'
    ],
    rule: 'Step 4A: Manually add songs.'
  },
  {
    id: 42,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Step 4B: Import YouTube Playlist',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="import-playlist-btn"]',
    actionPrompt: 'Import your YouTube or YouTube Music playlist.',
    actionType: 'none',
    description: 'Import a YouTube or YouTube Music playlist link to populate song titles.',
    bullets: [
      'Click "Import YouTube Playlist" to open the importer modal.',
      'Paste your YouTube or YouTube Music playlist URL and click Import.'
    ],
    rule: 'Step 4B: Import playlist.'
  },
  {
    id: 5,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Arrange Songs',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="rearrangeable-song-list"]',
    actionPrompt: 'Arrange your songs in the order you want.',
    actionType: 'none',
    description: 'Reorder songs or switch between Praise and Worship categories.',
    bullets: [
      'Drag and drop or use arrow buttons to reorder songs.',
      'Change category dropdown to move songs between Praise and Worship.'
    ],
    rule: 'Step 5: Arrange your songs.'
  },
  {
    id: 6,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Assign Members',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="team-assignments-panel"]',
    actionPrompt: 'Assign members to their designated ministries.',
    actionType: 'none',
    description: 'Assign members to their designated ministries using the controls below. You can assign as many ministries as needed before continuing.',
    bullets: [
      'Assign Song Leader(s), Backup Singers, Guitarist, Keyboardist, Bassist, Drummer, Audio/Live Technician, Lyricist, and other ministries.',
      'Supports 1 or 2 Song Leaders with automatic Praise/Worship split.',
      'Filters eligible members by ministry tag automatically.'
    ],
    rule: 'Step 6: Assign members to designated worship team roles.'
  },
  {
    id: 7,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Save Schedule',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="save-lineup-btn"]',
    actionPrompt: 'Save your lineup to continue.',
    actionType: 'click',
    description: 'Save the completed worship lineup to history.',
    bullets: [
      'Validates that at least one song is present.',
      'Checks for monthly duplicate song warnings before saving.'
    ],
    rule: 'Step 7: Save lineup to proceed to export.'
  },

  // STEP 8: SAVE & EXPORT CHOICE (Basic Guide Final Step)
  {
    id: 8,
    sectionTitle: 'Basic Guide',
    stepTitle: 'Export Line-up (Optional)',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="export-pdf-btn"]',
    actionPrompt: 'Line-up Saved Successfully! Would you like to export it?',
    actionType: 'none',
    description: 'Your lineup has been saved. Would you like to export it as PDF or PNG?',
    bullets: [
      'Export PDF for printable worship team sheets.',
      'Export PNG for sharing on mobile messaging apps.'
    ],
    rule: 'Step 8: Export PDF / PNG or Skip Export.'
  },
  {
    id: 10,
    sectionTitle: 'Help Topic — Saved Line-ups Archive',
    stepTitle: 'Saved Line-ups Archive & Search',
    targetTab: 'schedules',
    targetSelector: '[data-tour="schedules-view"]',
    actionPrompt: 'Explore saved line-ups, filters, and search.',
    actionType: 'none',
    description: 'View historical worship line-ups, filter by service type or date, search songs, and edit saved sets.',
    bullets: [
      'Filter by Sunday, Midweek, or all service types.',
      'Search by song title or worship team member name.',
      'Export PDF/PNG directly from saved history cards.'
    ],
    rule: 'Help Topic: Saved lineups archive.'
  },
  {
    id: 11,
    sectionTitle: 'Help Topic — Song Database',
    stepTitle: 'Song Database Repository',
    targetTab: 'songs',
    targetSelector: '[data-tour="songs-view"]',
    actionPrompt: 'Explore the central song database.',
    actionType: 'none',
    description: 'Manage master list of songs, original keys, perform counts, and category classifications.',
    bullets: [
      'Add new songs with key, artist, and Praise/Worship category.',
      'View play counts and last played date for every song.',
      'Get smart song recommendations based on recent usage.'
    ],
    rule: 'Help Topic: Song Database.'
  },
  {
    id: 12,
    sectionTitle: 'Help Topic — Member Roster',
    stepTitle: 'Volunteer Roster & Member Editor',
    targetTab: 'members',
    targetSelector: '[data-tour="members-view"]',
    actionPrompt: 'Manage worship team members and ministry tags.',
    actionType: 'none',
    description: 'Add members, assign ministry labels (Song Leader, Vocalist, Musician), and manage Disciplinary Action (DA) status.',
    bullets: [
      'Tag members with relevant roles for smart scheduler filtering.',
      'Set DA status to safely suspend member assignment eligibility.',
      'Manage custom tags and hierarchy.'
    ],
    rule: 'Help Topic: Member Roster.'
  },
  {
    id: 13,
    sectionTitle: 'Help Topic — Song Repetition Detection',
    stepTitle: 'First-Come Song Repetition Detection',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="rearrangeable-song-list"]',
    actionPrompt: 'Song repetition detection features.',
    actionType: 'none',
    description: 'Prevent overused songs with first-come, first-serve monthly usage warnings across schedules.',
    bullets: [
      'First lineup created in a month gets priority for requested songs.',
      'Highlights songs already scheduled earlier in the same month.',
      'Cross-month warnings help maintain song variety.'
    ],
    rule: 'Help Topic: Song Repetition.'
  },
  {
    id: 14,
    sectionTitle: 'Help Topic — Application Settings',
    stepTitle: 'Application Settings & Themes',
    targetTab: 'dashboard',
    targetSelector: '[data-tour="theme-toggle"]',
    actionPrompt: 'Customize themes and guide options.',
    actionType: 'none',
    description: 'Toggle Light, Dark, or AMOLED themes and configure guide preferences.',
    bullets: [
      'Choose visual theme options suited for sanctuary or stage lighting.',
      'Configure Interactive Guide behavior for new users.',
      'Customize default preferences and app behavior.'
    ],
    rule: 'Help Topic: Settings.'
  },
  {
    id: 15,
    sectionTitle: 'Help Topic — Backup & Restore',
    stepTitle: 'Backup & Restore Data',
    targetTab: 'scheduler',
    targetSelector: '[data-tour="header-backup-btn"]',
    actionPrompt: 'Backup and restore application data.',
    actionType: 'none',
    description: 'Export or restore complete JSON data backups safely.',
    bullets: [
      'Export complete JSON backup containing songs, members, and saved lineups.',
      'Restore backups anytime to recover or migrate data.'
    ],
    rule: 'Help Topic: Backup & Restore.'
  }
];
