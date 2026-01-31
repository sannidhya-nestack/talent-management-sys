# Product Requirements Document (PRD)
## Ergonomic Workspace Management Platform

**Version:** 1.0  
**Date:** February 2025  
**Project:** Ergonomic Workspace Assessment & Management System

---

## 1. Executive Summary

### 1.1 Product Overview
A comprehensive platform for managing ergonomic workspace assessments, client relationships, interior planning, and project execution. The system enables ergonomic consultants to assess workspaces, manage client relationships, design office layouts, and coordinate installations—all powered by AI assistance throughout the workflow.

### 1.2 Business Objectives
- Streamline client onboarding and management processes
- Automate workspace assessment workflows
- Enhance client communication and relationship tracking
- Provide intelligent interior planning capabilities
- Integrate with external tools (email, calendar, accounting)
- Enable data-driven decision making through AI-powered insights

### 1.3 Target Users
- **Primary:** Ergonomic consultants and workspace specialists
- **Secondary:** Client-facing staff, project managers, installation coordinators
- **Tertiary:** Clients (for questionnaire completion and approvals)

---

## 2. System Architecture

### 2.1 Technology Stack
- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript 5+
- **Database:** MySQL 8.0 (via Prisma ORM)
- **Authentication:** NextAuth.js (OAuth 2.0)
- **UI Components:** shadcn/ui + Tailwind CSS
- **AI Integration:** OpenAI API / Anthropic Claude API
- **File Storage:** Local storage / Cloud storage (AWS S3 / Cloudinary)
- **Email:** Nodemailer + Gmail/Outlook API
- **Calendar:** Google Calendar API / Microsoft Graph API
- **Accounting:** QuickBooks API / Xero API

### 2.2 Core Modules
1. **Client Management Module**
2. **Assessment & Questionnaire Module**
3. **Document Management Module**
4. **Interior Planning Module**
5. **Email Integration Module**
6. **Calendar Integration Module**
7. **Accounting Integration Module**
8. **AI Copilot Module**
9. **Installation Coordination Module**

---

## 3. Detailed Module Specifications

### 3.1 Client Management Module

#### 3.1.1 Quick Client Creation
**User Story:** As a consultant, I want to quickly add new clients so I can start managing their workspace projects immediately.

**Requirements:**
- **Entry Point:** "Add New Client" button on Client Management dashboard
- **Form Fields:**
  - Company name (required)
  - Industry (dropdown/autocomplete)
  - Primary contact information:
    - Contact name (required)
    - Email (required, validated)
    - Phone number
    - Job title
  - Initial project scope (text area)
  - Budget range (optional dropdown: <$10K, $10K-$50K, $50K-$100K, $100K+)
  - Client status (Active, Prospect, Inactive)
- **Validation:**
  - Email format validation
  - Duplicate client detection (by company name or email)
- **Post-Creation:**
  - Redirect to client detail page
  - Show success notification
  - Create initial activity log entry

#### 3.1.2 Client Detail View
**Components:**
- **Overview Tab:**
  - Company information
  - Primary contacts list
  - Project summary
  - Financial summary (total revenue, outstanding invoices)
  - Quick actions (Schedule assessment, Upload documents, Send email)

- **Activity Feed Tab:**
  - Timeline view of all interactions
  - Chronological list with filters:
    - Date range
    - Activity type (Assessment, Document, Payment, Communication, Installation)
    - User who performed action
  - Activity types:
    - Assessment conducted (with link to assessment report)
    - Documents uploaded (with preview/download)
    - Payments received (with invoice link)
    - Communications logged (calls, emails, meetings)
    - Installation scheduled/completed
    - Status changes
  - Each activity entry shows:
    - Timestamp
    - User who performed action
    - Activity description
    - Related documents/links
    - Action items (if applicable)

- **Communication Logging:**
  - Manual log entry form:
    - Communication type (Call, Email, Meeting, In-person visit)
    - Date and time
    - Participants (from client contacts)
    - Subject/topic
    - Notes (rich text editor)
    - Action items (multiple):
      - Description
      - Assigned to (team member)
      - Due date
      - Status (Pending, In Progress, Completed)
    - Attachments (documents, images)
  - Auto-logging from email integration (see Email Integration Module)
  - Search and filter capabilities
  - Export communication history

- **Documents Tab:**
  - Document categories:
    - Legal Documents (contracts, NDAs, agreements)
    - Financial Documents (invoices, quotes, payment receipts)
    - Project Documents (proposals, floor plans, specifications)
    - Assessment Reports
    - Installation Documents (schedules, photos, completion certificates)
  - Document features:
    - Bulk upload (drag-and-drop)
    - Automatic categorization using AI
    - OCR processing for searchable text
    - Version control
    - Download/Preview
    - Share with client (via email link)
  - Document metadata:
    - Upload date
    - Uploaded by
    - File size
    - File type
    - Tags
    - Related assessment/project

- **Financial Tab:**
  - Invoice list with filters:
    - Status (Draft, Sent, Paid, Overdue)
    - Date range
  - Payment history
  - Outstanding balances
  - Revenue summary (by project, by time period)
  - Integration with accounting software (see Accounting Integration)
  - Quick actions:
    - Create invoice
    - Mark as paid
    - Send payment reminder
    - Export financial report

- **Assessments Tab:**
  - List of all assessments conducted for client
  - Assessment status (Scheduled, In Progress, Completed, Report Generated)
  - Link to assessment reports
  - Quick action: "Schedule New Assessment"

- **Projects Tab:**
  - List of all projects for client
  - Project phases:
    - Assessment
    - Proposal
    - Approval
    - Installation
    - Post-Installation Review
  - Project timeline
  - Budget vs. actual spending

#### 3.1.3 Client List View
- **Filters:**
  - Status (Active, Prospect, Inactive)
  - Industry
  - Date range (created, last activity)
  - Search (company name, contact name, email)
- **Columns:**
  - Company name
  - Primary contact
  - Industry
  - Last activity date
  - Status
  - Total revenue
  - Actions (View, Edit, Archive)
- **Bulk Actions:**
  - Export selected clients
  - Update status
  - Send email to multiple clients

---

### 3.2 Assessment & Questionnaire Module

#### 3.2.1 Client-Facing Questionnaire System
**User Story:** As a consultant, I want to send customizable questionnaires to clients so they can provide workspace information before on-site visits.

**Requirements:**

**Questionnaire Creation:**
- **AI-Powered Form Builder:**
  - Consultant provides:
    - Client name
    - Industry
    - Company size
    - Special focus areas (e.g., sustainability, hybrid work)
  - AI generates tailored questionnaire including:
    - Industry-specific questions
    - Company-specific references
    - Work pattern questions
    - Customized based on company size and structure
  - Consultant can:
    - Review and edit generated questions
    - Add custom questions
    - Reorder questions
    - Set question types:
      - Multiple choice
      - Multiple select
      - Text input
      - Rating scale (1-5, 1-10)
      - Yes/No
      - File upload
    - Set required/optional
    - Add help text
    - Save as template for similar clients

**Questionnaire Distribution:**
- **Email Sending:**
  - Select client(s)
  - Select questionnaire template
  - Customize email message
  - Set deadline (optional)
  - Send via platform email integration
  - Track delivery and open status
- **Public Link:**
  - Generate unique, shareable link
  - Link can be sent via any channel
  - Access control (password optional, expiration date optional)

**Questionnaire Interface (Client-Facing):**
- **Design:**
  - Clean, professional form layout
  - Mobile-responsive
  - Progress indicator
  - Save draft functionality
  - Auto-save every 30 seconds
- **Features:**
  - Conditional logic (show/hide questions based on answers)
  - File upload with preview
  - Validation on submit
  - Confirmation page after submission

#### 3.2.2 Questionnaire Response Review
**User Story:** As a consultant, I want to review client questionnaire responses to understand their workspace needs before conducting assessments.

**Requirements:**

**Response Dashboard:**
- **Overview:**
  - List of all questionnaires sent
  - Completion status:
    - Sent (not started)
    - In Progress (started but not submitted)
    - Completed
    - Overdue (past deadline)
  - Response rate statistics
- **Response View:**
  - Organized display of all responses
  - Grouped by question category
  - Highlight key pain points and concerns
  - AI pre-analysis:
    - Flags potential high-risk areas
    - Identifies common issues
    - Suggests focus areas for on-site assessment
    - Generates summary insights
- **Data Integration:**
  - Responses automatically feed into risk identification system
  - Staff can add on-site observations to supplement questionnaire data
  - Combined data creates comprehensive assessment picture
- **Export:**
  - Export responses as PDF
  - Export as CSV for analysis
  - Include in assessment report

#### 3.2.3 Workspace Assessment
**User Story:** As a consultant, I want to conduct comprehensive workspace assessments and generate detailed reports.

**Requirements:**

**Assessment Workflow:**
1. **Pre-Assessment:**
   - Review questionnaire responses
   - Review client documents
   - Prepare assessment checklist
   - Schedule on-site visit (calendar integration)

2. **On-Site Assessment:**
   - Mobile-friendly assessment form
   - Capture:
     - Workstation photos
     - Measurements
     - Risk factors (posture, lighting, equipment)
     - Employee interviews
     - Observations
   - Offline capability (sync when online)

3. **Assessment Data Entry:**
   - Upload photos with annotations
   - Risk scoring system:
     - Low risk (green)
     - Medium risk (yellow)
     - High risk (red)
   - Categorize by:
     - Workstation type
     - Department
     - Risk level
   - Link to questionnaire responses

4. **Report Generation:**
   - AI-powered report generation:
     - Executive summary
     - Key findings
     - Risk analysis
     - Recommendations
     - Product suggestions (from catalog)
     - Cost estimates
   - Customizable report templates
   - Include:
     - Photos with annotations
     - Charts and visualizations
     - Action items
     - Timeline for implementation
   - Export formats:
     - PDF (branded)
     - Word document
     - Shareable link

**Assessment History:**
- View all assessments for a client
- Compare assessments over time
- Track improvements
- Generate trend reports

---

### 3.3 Document Management Module

#### 3.3.1 Document Upload & Organization
**User Story:** As a consultant, I want to easily upload and organize client documents so I can quickly access them when needed.

**Requirements:**

**Bulk Upload:**
- Drag-and-drop interface
- Support multiple file types:
  - PDFs
  - Images (JPG, PNG)
  - Office documents (Word, Excel, PowerPoint)
  - CAD files (DWG, DXF)
  - Text files
- Upload progress indicator
- File size limits (configurable, default 50MB per file)

**Automatic Categorization:**
- AI-powered document classification:
  - Contracts → Legal Documents
  - Invoices → Financial Documents
  - Proposals → Project Documents
  - Floor plans → Project Documents
  - Photos → Assessment Documents
- Manual override for categorization
- Tag system for additional organization

**OCR Processing:**
- Automatic OCR for scanned documents
- Extract searchable text
- Enable full-text search across documents
- Support multiple languages

**Document Features:**
- **Preview:**
  - In-browser preview for common formats
  - Image viewer with zoom
  - PDF viewer with annotations
- **Version Control:**
  - Track document versions
  - Compare versions
  - Restore previous versions
- **Sharing:**
  - Generate shareable links
  - Set expiration dates
  - Password protection
  - Track access (who viewed, when)
- **Search:**
  - Full-text search
  - Filter by:
    - Category
    - Tags
    - Date range
    - File type
    - Client
  - Search within document content (OCR text)

---

### 3.4 Interior Planning Module

#### 3.4.1 Space Analysis
**User Story:** As a consultant, I want to analyze client floor plans to design optimal workspace layouts.

**Requirements:**

**Floor Plan Upload:**
- Support formats:
  - PDF
  - Images (JPG, PNG)
  - CAD files (DWG, DXF) - via conversion service
- **Interactive Space Mapping:**
  - Upload floor plan
  - System recognizes dimensions and spaces
  - Manual dimension input if not detected
  - Mark:
    - Walls
    - Doors
    - Windows
    - Columns
    - Fixed fixtures
  - Define space types:
    - Workstations
    - Collaboration spaces
    - Private offices
    - Meeting rooms
    - Reception areas
    - Break rooms
    - Storage

**Space Requirements Input:**
- Number of workstations needed
- Collaboration space requirements
- Private office count
- Meeting room specifications
- Reception area needs
- Break room requirements
- Accessibility requirements
- Special considerations

#### 3.4.2 Design & Layout
**User Story:** As a consultant, I want to design workspace layouts with furniture placement and generate visualizations for client approval.

**Requirements:**

**Interactive Layout Designer:**
- **Drag-and-Drop Interface:**
  - Furniture items from product catalog
  - Real-time space utilization calculations
  - Collision detection
  - Snap-to-grid functionality
- **Product Catalog Integration:**
  - Browse full product catalog
  - Filter by:
    - Category (desks, chairs, tables, storage, accessories)
    - Brand (HAG, Humanscale, ergoFocus, etc.)
    - Price range
    - Availability
    - Dimensions
  - Product details:
    - Specifications
    - Dimensions
    - Images (multiple angles)
    - Price
    - Availability status
    - Lead time
- **Design Tools:**
  - Measure distances
  - Add annotations
  - Create multiple design options
  - Save design iterations
- **Compliance Checking:**
  - Egress requirements
  - Accessibility standards (ADA compliance)
  - Fire code compliance
  - Space per person requirements
  - Automatic warnings for violations

**3D Visualization:**
- Generate 3D renderings of proposed layouts
- Multiple design options side-by-side
- Virtual walkthrough capabilities:
  - First-person view
  - Fly-through animation
  - 360° views
- Realistic materials and lighting
- Share with clients for approval:
  - Interactive 3D viewer (web-based)
  - Export as images
  - Export as video walkthrough

#### 3.4.3 Proposal Generation
**User Story:** As a consultant, I want to generate professional proposals with design rationale, product specifications, and pricing.

**Requirements:**

**Automated Proposal Generation:**
- **Content Sections:**
  - Executive summary
  - Design rationale
  - Space analysis
  - Product specifications (detailed)
  - Detailed pricing (itemized)
  - Installation timeline
  - Project phases
  - Terms and conditions
- **Customization:**
  - Company branding
  - Custom sections
  - Optional add-ons
  - Multiple pricing tiers
- **Export Formats:**
  - PDF (branded, print-ready)
  - Word document (editable)
  - Shareable link
- **Approval Workflow:**
  - Send to client for review
  - Track approval status
  - Version control
  - Comments and revisions

---

### 3.5 Email Integration Module

#### 3.5.1 Email Account Connection
**User Story:** As a consultant, I want to connect my email account so I can send emails and track communications directly from the platform.

**Requirements:**

**Supported Providers:**
- Gmail (OAuth 2.0)
- Outlook/Office 365 (OAuth 2.0)
- IMAP/SMTP (generic email providers)

**Connection Process:**
- OAuth flow for Gmail/Outlook
- Secure credential storage (encrypted)
- Token refresh handling
- Multi-account support (per user)
- Connection status indicator

#### 3.5.2 Email Features
**Automatic Logging:**
- **Inbound Emails:**
  - Monitor connected email account
  - Identify emails from client contacts
  - Automatically log to client activity feed
  - Extract attachments and add to client documents
  - Thread detection (group related emails)
- **Outbound Emails:**
  - Track emails sent from platform
  - Log to client activity feed
  - Link to related assessments/projects

**Email Sending:**
- **Compose Interface:**
  - Rich text editor
  - Client contact autocomplete
  - Template library:
    - Assessment scheduling
    - Proposal delivery
    - Follow-up reminders
    - Payment reminders
  - Attachment support
  - Schedule send (future date/time)
- **Template Variables:**
  - Client name
  - Company name
  - Assessment date
  - Project details
  - Custom fields
- **Send Reports:**
  - Send assessment reports directly from platform
  - Send proposals
  - Send invoices
  - Track delivery and open status

**Email Management:**
- View all emails for a client
- Search email history
- Filter by date, sender, subject
- Export email threads

---

### 3.6 Calendar Integration Module

#### 3.6.1 Calendar Connection
**User Story:** As a consultant, I want to sync my calendar so I can schedule assessments and meetings without leaving the platform.

**Requirements:**

**Supported Providers:**
- Google Calendar (OAuth 2.0)
- Outlook Calendar / Microsoft 365 (OAuth 2.0)

**Connection Process:**
- OAuth flow
- Select which calendars to sync
- Two-way sync (read and write)
- Real-time sync (webhook-based where possible)

#### 3.6.2 Calendar Features
**Scheduling:**
- **Schedule Assessments:**
  - Select client
  - Select date and time
  - Duration (default: 2 hours)
  - Location (on-site address from client profile)
  - Create calendar event
  - Send invitation to client
  - Add to client activity feed
- **Schedule Meetings:**
  - Internal team meetings
  - Client meetings
  - Installation coordination meetings
  - Auto-add to relevant calendars

**Reminders:**
- **Follow-up Reminders:**
  - Set reminders for action items
  - Reminders for payment follow-ups
  - Assessment report delivery reminders
  - Installation preparation reminders
- **Notification Methods:**
  - In-app notifications
  - Email notifications
  - Calendar reminders

**Time Blocking:**
- Block time for project work
- Block time for report generation
- Block time for proposal creation
- Visual calendar view in platform
- Conflict detection

**Calendar View:**
- Month view
- Week view
- Day view
- Filter by:
  - Client
  - Event type
  - Team member

---

### 3.7 Accounting Integration Module

#### 3.7.1 Accounting Software Connection
**User Story:** As a consultant, I want to connect my accounting software so financial data stays synchronized.

**Requirements:**

**Supported Providers:**
- QuickBooks Online (OAuth 2.0)
- Xero (OAuth 2.0)
- Manual import (CSV)

**Connection Process:**
- OAuth flow for QuickBooks/Xero
- Secure credential storage
- Select which accounts to sync
- Initial data sync
- Ongoing sync (real-time or scheduled)

#### 3.7.2 Financial Data Sync
**Invoices:**
- **Sync from Accounting:**
  - Pull invoices created in accounting software
  - Link to clients in platform
  - Display in client financial tab
- **Create in Platform:**
  - Generate invoice from proposal
  - Create invoice manually
  - Push to accounting software
  - Track status (Draft, Sent, Paid)

**Payments:**
- Sync payment records
- Link payments to invoices
- Update invoice status automatically
- Track payment methods
- Payment date and amount

**Financial Reporting:**
- **Automatic Reports:**
  - Revenue by client
  - Revenue by time period
  - Outstanding invoices
  - Payment trends
  - Profit margins (if cost data available)
- **Export:**
  - Export to accounting software
  - Export as CSV/Excel
  - Generate PDF reports

**Reconciliation:**
- Match platform invoices with accounting records
- Identify discrepancies
- Manual reconciliation tools

---

### 3.8 AI Copilot Module

#### 3.8.1 Universal AI Assistant
**User Story:** As a consultant, I want an AI assistant available on every page to help me understand data, answer questions, and perform tasks.

**Requirements:**

**UI Component:**
- Floating chat interface (bottom-right corner)
- Expandable/collapsible
- Always accessible (sticky)
- Context-aware (knows current page/client)

**Core Capabilities:**

1. **Questionnaire Generation (Assessment Page):**
   - Input: Client name, industry, company size, focus areas
   - Output: Tailored questionnaire with 30-50 questions
   - Industry-specific questions
   - Company-specific references
   - Customizable question types
   - Example interaction:
     ```
     User: "Create a questionnaire for Nikola Corporation, 
            automotive industry, 500 employees, focus on 
            sustainability and zero-emission workspace"
     
     AI: "I've created a 35-question assessment questionnaire 
          tailored for Nikola Corporation. It includes sections 
          on their zero-emission focus, manufacturing workspace 
          considerations, and hybrid work patterns. Would you 
          like me to add any specific questions about their 
          vehicle testing facilities?"
     ```

2. **Activity Feed Analysis (Client Management Page):**
   - Summarize recent activity
   - Answer questions about timeline
   - Identify patterns
   - Example interactions:
     ```
     User: "What's been happening with this client recently?"
     
     AI: "Here's a summary of recent activity: Last assessment 
          was completed on January 22nd. Three documents were 
          uploaded this week - updated contract, Phase 2 proposal, 
          and installation schedule. Payment of $45,000 was 
          received on February 1st. Two follow-up calls were 
          logged - one about furniture delivery timeline, another 
          about warranty questions. Next milestone: Installation 
          scheduled for March 5th."
     
     User: "When was the last time we spoke with their Facilities Manager?"
     
     AI: "Last communication with Sarah Johnson (Facilities Manager) 
          was a call on February 3rd. Notes indicate discussion about 
          Phase 2 furniture delivery. Action item: Confirm installation 
          team availability. Follow-up reminder set for February 10th."
     
     User: "What action items are pending for this client?"
     
     AI: "Three pending action items: 1) Confirm installation team 
          availability (due Feb 10th), 2) Send updated color selection 
          options (due Feb 12th), 3) Schedule post-installation 
          walkthrough (due after March 5th installation)."
     ```

3. **Financial Queries (Financial Tab):**
   - Answer payment questions
   - Calculate totals
   - Identify overdue invoices
   - Example interactions:
     ```
     User: "When is Nikola Corporation's next payment date?"
     AI: "The next payment of $45,000 is due on March 15th for 
          the Phase 2 furniture installation."
     
     User: "What's the total revenue from this client this year?"
     AI: "Total revenue for 2024 is $287,500 across three projects."
     
     User: "Show me all overdue invoices for this client."
     AI: "One overdue invoice: Invoice #INV-2024-089 for $12,500, 
          due on February 1st (45 days overdue)."
     ```

4. **Document Analysis (Documents Tab):**
   - Extract information from documents
   - Answer questions about contract terms
   - Summarize documents
   - Example interactions:
     ```
     User: "What does the contract say about warranty coverage?"
     AI: "The contract specifies a 5-year warranty on all 
          ergonomic furniture, covering manufacturing defects 
          and normal wear."
     
     User: "Summarize the key terms from all legal documents."
     AI: [Provides comprehensive summary of all contracts, NDAs, 
          and agreements]
     ```

5. **Assessment Review (Assessment History Tab):**
   - Summarize assessment findings
   - Answer questions about recommendations
   - Compare assessments over time
   - Example interactions:
     ```
     User: "When was the last assessment conducted, and what were 
           the main findings?"
     AI: "Last assessment was on January 22nd, 2024. Main findings: 
          12 medium-risk workstations identified, 8 high-risk areas 
          requiring immediate attention. Recommendations included 
          height-adjustable desks and ergonomic seating for 45 employees."
     
     User: "What furniture items did we recommend in the last assessment?"
     AI: "Recommended items include: 25 HAG Capisco chairs, 18 
          height-adjustable desks, 12 monitor arms, and 8 
          anti-fatigue mats."
     ```

6. **Interior Planning Assistance (Interior Planning Page):**
   - Suggest furniture based on requirements
   - Recommend layouts
   - Answer product questions
   - Example interactions:
     ```
     User: "Suggest furniture for a 50-person open office with 
           hybrid work patterns."
     AI: [Analyzes client's previous assessments, industry standards, 
          product catalog, budget considerations]
          "Based on your client's needs and previous assessments, 
          I recommend: 35 height-adjustable desks (mix of sit-stand), 
          40 ergonomic chairs (HAG Capisco for collaborative areas, 
          Humanscale Freedom for focused work), 12 collaboration 
          tables, and 8 phone booths for privacy. Estimated cost: 
          $125,000-$150,000."
     
     User: "What's the best layout for this floor plan considering 
           traffic flow?"
     AI: [Reviews uploaded floor plan]
          "Considering the main entrance and break room location, 
          I recommend placing workstations in a grid pattern with 
          6-foot aisles. Position collaboration areas near the 
          center, and private offices along the perimeter. This 
          layout minimizes traffic through work areas while 
          maximizing natural light."
     ```

**Conversational Context:**
- Maintains context across conversation
- Remembers previous questions in session
- Can reference earlier answers
- Example:
  ```
  User: "What's the payment status?"
  AI: "All payments are current. Next payment due March 15th."
  
  User: "When was the last payment received?"
  AI: "Last payment of $45,000 was received on February 1st."
  
  User: "What was that payment for?"
  AI: "That payment was for Phase 1 furniture installation - 
       25 HAG Capisco chairs and 18 height-adjustable desks."
  
  User: "Show me the invoice for that payment."
  AI: "Here's Invoice #INV-2024-087 dated January 15th. 
       [Displays invoice details and download link]"
  ```

**Technical Implementation:**
- **AI Provider:** OpenAI GPT-4 / Anthropic Claude
- **Context Window:** Include relevant data from current page
- **Data Access:**
  - Client information
  - Activity feed
  - Documents (via OCR/text extraction)
  - Financial data
  - Assessment history
  - Product catalog
- **Response Format:**
  - Natural language responses
  - Structured data when appropriate (lists, tables)
  - Action buttons for common follow-ups
  - Links to relevant pages/documents

**Privacy & Security:**
- No data sent to AI provider that isn't necessary
- Client data anonymized where possible
- Audit log of all AI interactions
- User can disable AI features per client if needed

---

### 3.9 Installation Coordination Module

#### 3.9.1 Installation Scheduling
**User Story:** As a project manager, I want to schedule installations and track their progress.

**Requirements:**

**Installation Creation:**
- Link to client
- Link to project/proposal
- Installation date and time
- Duration estimate
- Location (address, floor, room numbers)
- Installation team assignment
- Required equipment/tools
- Special instructions

**Calendar Integration:**
- Create calendar events
- Block team member calendars
- Send invitations to:
  - Installation team
  - Client contacts
  - Project manager

#### 3.9.2 Delivery Tracking
- Track delivery status:
  - Ordered
  - In transit
  - Delivered to warehouse
  - Delivered to site
  - Installation complete
- Delivery date tracking
- Delivery confirmation (signature capture)
- Photo documentation

#### 3.9.3 Installation Management
- **Team Management:**
  - Assign installation teams
  - Team member availability
  - Skills/certifications tracking
- **Progress Tracking:**
  - Installation checklist
  - Photo documentation
  - Issue reporting
  - Completion status
- **Post-Installation:**
  - Walkthrough scheduling
  - Client sign-off
  - Warranty activation
  - Follow-up assessment scheduling

---

## 4. User Interface & Experience

### 4.1 Design Principles
- **Clean & Professional:** Modern, uncluttered interface
- **Mobile-First:** Responsive design for all screen sizes
- **Accessibility:** WCAG 2.1 AA compliance
- **Consistency:** Unified design system across all modules
- **Performance:** Fast load times, smooth interactions

### 4.2 Navigation Structure
```
Dashboard
├── Clients
│   ├── Client List
│   ├── Client Detail
│   │   ├── Overview
│   │   ├── Activity Feed
│   │   ├── Documents
│   │   ├── Financial
│   │   ├── Assessments
│   │   └── Projects
│   └── Add New Client
├── Assessments
│   ├── Assessment List
│   ├── Create Assessment
│   ├── Questionnaire Builder
│   └── Assessment Reports
├── Interior Planning
│   ├── Projects
│   ├── Layout Designer
│   ├── Product Catalog
│   └── Proposals
├── Installations
│   ├── Schedule
│   ├── Delivery Tracking
│   └── Team Management
├── Integrations
│   ├── Email
│   ├── Calendar
│   └── Accounting
└── Settings
    ├── Profile
    ├── Team
    ├── Product Catalog
    └── Templates
```

### 4.3 Key UI Components
- **Dashboard:** Overview cards, recent activity, quick actions
- **Data Tables:** Sortable, filterable, paginated
- **Forms:** Multi-step wizards, inline editing, validation
- **Modals/Dialogs:** For quick actions, confirmations
- **AI Chat Interface:** Floating, expandable, context-aware
- **File Upload:** Drag-and-drop, progress indicators
- **Calendar Views:** Month/week/day views
- **3D Viewer:** WebGL-based 3D visualization

---

## 5. Data Model

### 5.1 Core Entities

**Client**
- id, companyName, industry, status
- contacts (array)
- createdAt, updatedAt

**Contact**
- id, clientId, name, email, phone, jobTitle, isPrimary

**Project**
- id, clientId, name, status, phase, budget, startDate, endDate

**Assessment**
- id, clientId, projectId, type, status, conductedDate, reportUrl

**Questionnaire**
- id, clientId, templateId, status, sentDate, deadline, responses

**QuestionnaireResponse**
- id, questionnaireId, questionId, answer, submittedAt

**Document**
- id, clientId, category, fileName, fileUrl, fileType, uploadedAt, uploadedBy, ocrText

**Activity**
- id, clientId, type, description, userId, timestamp, metadata

**Communication**
- id, clientId, type, participants, subject, notes, actionItems, date

**Invoice**
- id, clientId, projectId, number, amount, status, dueDate, paidDate

**Payment**
- id, invoiceId, amount, date, method, reference

**Installation**
- id, clientId, projectId, scheduledDate, status, team, location

**Product**
- id, name, brand, category, price, dimensions, specifications, images

**Layout**
- id, clientId, projectId, floorPlanUrl, designData, status

**User**
- id, email, name, role, permissions

### 5.2 Integration Entities

**EmailAccount**
- id, userId, provider, email, accessToken, refreshToken, expiresAt

**CalendarAccount**
- id, userId, provider, calendarId, accessToken, refreshToken

**AccountingAccount**
- id, userId, provider, accessToken, refreshToken, lastSyncAt

---

## 6. Integration Specifications

### 6.1 Email Integration (Gmail/Outlook)
- **OAuth 2.0 Flow**
- **APIs Used:**
  - Gmail API (messages, send, attachments)
  - Microsoft Graph API (mail, send)
- **Scopes Required:**
  - Gmail: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`
  - Outlook: `Mail.Send`, `Mail.Read`

### 6.2 Calendar Integration (Google/Outlook)
- **OAuth 2.0 Flow**
- **APIs Used:**
  - Google Calendar API
  - Microsoft Graph API (Calendar)
- **Scopes Required:**
  - Google: `https://www.googleapis.com/auth/calendar`
  - Outlook: `Calendars.ReadWrite`

### 6.3 Accounting Integration (QuickBooks/Xero)
- **OAuth 2.0 Flow**
- **APIs Used:**
  - QuickBooks Online API
  - Xero API
- **Data Synced:**
  - Invoices
  - Payments
  - Customers/Clients
  - Items/Products

### 6.4 AI Integration
- **Provider:** OpenAI API or Anthropic Claude API
- **Endpoints:**
  - Chat completions
  - Document analysis
  - Text generation
- **Rate Limiting:** Implement request throttling
- **Cost Management:** Track token usage, implement caching

---

## 7. Security & Privacy

### 7.1 Authentication & Authorization
- OAuth 2.0 for user authentication
- Role-based access control (RBAC)
- Session management
- Password policies (if applicable)

### 7.2 Data Security
- Encryption at rest (database)
- Encryption in transit (HTTPS/TLS)
- Secure credential storage (encrypted tokens)
- Regular security audits

### 7.3 Privacy
- GDPR compliance
- Data retention policies
- User data export
- Data deletion on request
- Privacy policy and terms of service

### 7.4 Audit & Compliance
- Comprehensive audit logging
- Data access tracking
- Compliance reporting
- Backup and disaster recovery

---

## 8. Performance Requirements

### 8.1 Response Times
- Page load: < 2 seconds
- API responses: < 500ms (p95)
- File upload: Progress indication, async processing
- Search: < 1 second for results

### 8.2 Scalability
- Support 1000+ clients
- 10,000+ documents
- 100+ concurrent users
- Handle large file uploads (up to 50MB)

### 8.3 Availability
- 99.5% uptime target
- Graceful degradation
- Error handling and recovery

---

## 9. Development Phases

### Phase 1: Foundation (Weeks 1-4)
- Project setup and architecture
- Database schema design
- Authentication system
- Basic client management
- Document upload (basic)

### Phase 2: Core Features (Weeks 5-8)
- Client detail views
- Activity feed
- Communication logging
- Document management (full)
- Basic assessment workflow

### Phase 3: Assessment & Questionnaire (Weeks 9-12)
- Questionnaire builder
- Client-facing questionnaire
- Response review dashboard
- Assessment workflow
- Report generation

### Phase 4: Integrations (Weeks 13-16)
- Email integration
- Calendar integration
- Accounting integration
- AI copilot (basic)

### Phase 5: Interior Planning (Weeks 17-20)
- Floor plan upload
- Layout designer
- Product catalog
- 3D visualization
- Proposal generation

### Phase 6: Advanced Features (Weeks 21-24)
- Installation coordination
- Advanced AI features
- Analytics and reporting
- Mobile app (optional)
- Performance optimization

### Phase 7: Testing & Launch (Weeks 25-28)
- Comprehensive testing
- User acceptance testing
- Bug fixes
- Documentation
- Launch preparation

---

## 10. Success Metrics

### 10.1 User Adoption
- Active users per month
- Feature usage rates
- User satisfaction scores

### 10.2 Efficiency Metrics
- Time to create client record
- Time to generate assessment report
- Time to create proposal
- Reduction in manual data entry

### 10.3 Business Metrics
- Number of clients managed
- Number of assessments conducted
- Revenue tracked
- Proposal conversion rate

### 10.4 Technical Metrics
- System uptime
- Page load times
- API response times
- Error rates

---

## 11. Future Enhancements

### 11.1 Mobile Applications
- Native iOS app
- Native Android app
- Offline capabilities

### 11.2 Advanced AI Features
- Predictive analytics
- Automated risk assessment
- Smart recommendations
- Natural language to actions

### 11.3 Additional Integrations
- Slack/Teams notifications
- CRM integrations (Salesforce, HubSpot)
- Project management tools (Asana, Trello)
- Video conferencing (Zoom, Teams)

### 11.4 Advanced Reporting
- Custom report builder
- Scheduled reports
- Data visualization dashboards
- Export to BI tools

---

## 12. Assumptions & Dependencies

### 12.1 Assumptions
- Users have stable internet connection
- Clients have email access for questionnaires
- Accounting software supports API access
- AI service providers maintain availability
- File storage solution is scalable

### 12.2 Dependencies
- Third-party API availability (Gmail, Outlook, QuickBooks, Xero)
- AI service provider availability
- Database hosting reliability
- CDN for file delivery
- Email service provider

### 12.3 Constraints
- Budget limitations
- Timeline constraints
- Third-party API rate limits
- File storage costs
- AI API costs

---

## 13. Risk Management

### 13.1 Technical Risks
- **Third-party API changes:** Version management, fallback options
- **AI service downtime:** Graceful degradation, cached responses
- **Data loss:** Regular backups, disaster recovery plan
- **Performance issues:** Load testing, optimization, scaling plan

### 13.2 Business Risks
- **Low user adoption:** User training, clear value proposition
- **Integration failures:** Robust error handling, manual workarounds
- **Data privacy concerns:** Clear privacy policy, security audits

### 13.3 Mitigation Strategies
- Regular backups
- Monitoring and alerting
- User feedback collection
- Iterative development
- Phased rollout

---

## 14. Appendices

### 14.1 Glossary
- **Assessment:** On-site evaluation of workspace ergonomics
- **Questionnaire:** Client-facing form to gather workspace information
- **Proposal:** Detailed plan with furniture recommendations and pricing
- **Layout:** Visual representation of furniture placement in space
- **Installation:** Physical delivery and setup of furniture

### 14.2 References
- Existing talent management system codebase
- shadcn/ui component library
- Next.js documentation
- Prisma documentation
- Integration API documentation

---

**Document Status:** Draft  
**Last Updated:** February 2025  
**Next Review:** After Phase 1 completion
