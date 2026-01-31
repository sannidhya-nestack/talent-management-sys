/**
 * UI Strings Configuration
 *
 * All user-facing text in the application.
 * Centralised here for easy customisation and future localisation.
 * Uses British English spelling throughout.
 */

export const strings = {
  // Dashboard
  login: {
    action: 'Authenticate with',
    subtitle: "Only authorised personnel may access this system.",
  },
  
  dashboard: {
    title: 'Ergonomic Workspace Dashboard',
    welcome: 'Welcome back',
    overview: 'Overview',
    recentActivity: 'Recent Activity',
    noActivity: 'No recent activity',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    clients: 'Clients',
    assessments: 'Assessments',
    questionnaires: 'Questionnaires',
    interiorPlanning: 'Interior Planning',
    installations: 'Installations',
    integrations: 'Integrations',
    settings: 'Settings',
    logout: 'Log out',
  },

  // Client statuses
  clientStatuses: {
    active: 'Active',
    prospect: 'Prospect',
    inactive: 'Inactive',
  },

  // Client detail tabs
  clientTabs: {
    overview: 'Overview',
    activity: 'Activity Feed',
    documents: 'Documents',
    financial: 'Financial',
    assessments: 'Assessments',
    projects: 'Projects',
  },

  // Cards and metrics
  metrics: {
    totalClients: 'Total Clients',
    activeClients: 'Active Clients',
    totalAssessments: 'Total Assessments',
    pendingInstallations: 'Pending Installations',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
  },

  // Actions
  actions: {
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    sendEmail: 'Send Email',
    exportPdf: 'Export PDF',
    scheduleAssessment: 'Schedule Assessment',
    uploadDocuments: 'Upload Documents',
    addClient: 'Add New Client',
    createQuestionnaire: 'Create Questionnaire',
    createAssessment: 'Create Assessment',
    createProject: 'Create Project',
  },

  // Forms (UI elements)
  forms: {
    required: 'Required',
    optional: 'Optional',
    selectOption: 'Select an option',
    searchPlaceholder: 'Search...',
    filterBy: 'Filter by',
    sortBy: 'Sort by',
  },

  // Client Management
  clients: {
    title: 'Clients',
    addNew: 'Add New Client',
    companyName: 'Company Name',
    industry: 'Industry',
    primaryContact: 'Primary Contact',
    status: 'Status',
    lastActivity: 'Last Activity',
    totalRevenue: 'Total Revenue',
    noClients: 'No clients yet',
    createClient: 'Create Client',
    editClient: 'Edit Client',
    deleteClient: 'Delete Client',
  },

  // Assessments
  assessments: {
    title: 'Assessments',
    createNew: 'Create Assessment',
    type: 'Assessment Type',
    status: 'Status',
    conductedDate: 'Conducted Date',
    reportGenerated: 'Report Generated',
    noAssessments: 'No assessments yet',
    viewReport: 'View Report',
    generateReport: 'Generate Report',
  },

  // Questionnaires
  questionnaires: {
    title: 'Questionnaires',
    createNew: 'Create Questionnaire',
    sendToClient: 'Send to Client',
    viewResponses: 'View Responses',
    status: 'Status',
    sentDate: 'Sent Date',
    deadline: 'Deadline',
    completed: 'Completed',
    noQuestionnaires: 'No questionnaires yet',
  },

  // Documents
  documents: {
    title: 'Documents',
    upload: 'Upload Documents',
    bulkUpload: 'Bulk Upload',
    category: 'Category',
    fileName: 'File Name',
    uploadedBy: 'Uploaded By',
    uploadedAt: 'Uploaded At',
    noDocuments: 'No documents yet',
    preview: 'Preview',
    download: 'Download',
    delete: 'Delete',
  },

  // Interior Planning
  interiorPlanning: {
    title: 'Interior Planning',
    createLayout: 'Create Layout',
    floorPlan: 'Floor Plan',
    productCatalog: 'Product Catalog',
    generateProposal: 'Generate Proposal',
    noLayouts: 'No layouts yet',
  },

  // Installations
  installations: {
    title: 'Installations',
    schedule: 'Schedule Installation',
    status: 'Status',
    scheduledDate: 'Scheduled Date',
    location: 'Location',
    team: 'Team',
    noInstallations: 'No installations scheduled',
  },

  // Integrations
  integrations: {
    title: 'Integrations',
    email: 'Email',
    calendar: 'Calendar',
    accounting: 'Accounting',
    connect: 'Connect',
    disconnect: 'Disconnect',
    connected: 'Connected',
    notConnected: 'Not Connected',
  },

  // Settings
  settings: {
    title: 'Settings',
    profile: 'Profile',
    team: 'Team',
    productCatalog: 'Product Catalog',
    templates: 'Templates',
  },
} as const;

export type Strings = typeof strings;
