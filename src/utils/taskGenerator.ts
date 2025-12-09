import { v4 as uuidv4 } from 'uuid';
import { Task } from '../store/agentStore';

export const generateDetailedTasks = (projectIdea: string): Task[] => {
   const tasks: Task[] = [];
   const ideaLower = projectIdea.toLowerCase();

   // Context Detection
   const isEcommerce = ideaLower.includes('shop') || ideaLower.includes('store') || ideaLower.includes('e-commerce') || ideaLower.includes('market');
   const isChat = ideaLower.includes('chat') || ideaLower.includes('messaging') || ideaLower.includes('social');
   const isContent = ideaLower.includes('blog') || ideaLower.includes('news') || ideaLower.includes('cms') || ideaLower.includes('article');
   const isSaaS = !isEcommerce && !isChat && !isContent; // Default to SaaS/Dashboard structure

   // --- CORE MODULES (Universal) ---
   // 1. Authentication Module
   tasks.push({
      id: uuidv4(),
      title: 'Frontend: Secure Authentication Module',
      description: `
Objective: Develop a secure, responsive Login and Verification interface.

UI Specifications:
1. Login Screen (/login):
   - Container: Centered Card layout (max-w-md), Glassmorphism effect.
   - Email Input:
     - HTML: <input type="email" id="email" required />
     - Validation: Regex /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.
     - Error State: Red border, "Please enter a valid email."
   - Password Input:
     - HTML: <input type="password" id="password" required />
     - Validation: Min 8 chars.
   - Submit Button:
     - Text: "Sign In"
     - State: Disabled until form is valid. Loading spinner on click.
   - Links: "Forgot Password?", "Create Account".

2. Responsiveness:
   - Mobile: Inputs 100% width, padding 16px.
   - Desktop: Padding 32px, shadow-xl.

Integration:
- Connect to POST /api/auth/login.
- Store JWT in localStorage or HttpOnly Cookie.
- Redirect to /dashboard on success.
`.trim(),
      status: 'todo',
      progress: 0,
      complexity: 5,
      dependencies: [],
      selected: true,
      category: 'Phase 1: Core Features',
      comments: [],
      history: [],
      outputHistory: [],
      type: 'frontend'
   });

   // 2. Dashboard Shell
   tasks.push({
      id: uuidv4(),
      title: 'Frontend: Main Dashboard Layout',
      description: `
Objective: Create the persistent application shell for authorized users.

Components:
1. Sidebar Navigation:
   - State: Collapsible (Desktop), Slide-over (Mobile).
   - Items: Dashboard, Projects, Settings, Profile.
   - Active State: Highlighted background (primary color/10).
2. Top Header:
   - Elements: Breadcrumbs, User Avatar dropdown, Notifications bell.
   - Behavior: Sticky top sticky top-0 z-50.
3. Main Content Area:
   - Layout: flex-1 overflow-y-auto p-6.
   - Breadcrumbs: Dynamic based on route.

Responsiveness:
- Mobile: Hamburger menu triggers Sidebar. Header creates overlay.
- Desktop: Sidebar fixed width (250px).
`.trim(),
      status: 'todo',
      progress: 0,
      complexity: 6,
      dependencies: [],
      selected: true,
      category: 'Phase 1: Core Features',
      comments: [],
      history: [],
      outputHistory: [],
      type: 'frontend'
   });

   // 3. Backend Auth APIs
   tasks.push({
      id: uuidv4(),
      title: 'Backend: API - Login Endpoint',
      description: `
Objective: Implement secure user authentication.

Endpoint: POST /api/auth/login

Authorization: Public

Request Body (JSON):
{
  "email": "user@example.com", // Required, Valid Email
  "password": "securePassword123" // Required, Min 8 chars
}

Response Body (Success 200 OK):
{
  "token": "jwt_token_string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}

Error Responses:
- 400 Bad Request: Missing fields or invalid format.
- 401 Unauthorized: Invalid credentials.
- 500 Internal Server Error: Database connection failed.

Implementation Details:
1. Validate input using Zod or Joi.
2. Find user by email in database.
3. Compare password hash (bcrypt).
4. Generate JWT with 24h expiry.
`.trim(),
      status: 'todo',
      progress: 0,
      complexity: 7,
      dependencies: [],
      selected: true,
      category: 'Phase 1: Core Features',
      comments: [],
      history: [],
      outputHistory: [],
      type: 'backend'
   });

   tasks.push({
      id: uuidv4(),
      title: 'Backend: API - Register Endpoint',
      description: `
Objective: Create new user account.

Endpoint: POST /api/auth/register

Authorization: Public

Request Body (JSON):
{
  "name": "John Doe", // Required, Max 50 chars
  "email": "user@example.com", // Required, Unique
  "password": "securePassword123" // Required, Min 8 chars
}

Response Body (Success 201 Created):
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}

Error Responses:
- 400 Bad Request: Validation failed.
- 409 Conflict: Email already exists.

Implementation Details:
1. Hash password using bcrypt (salt rounds 10).
2. Create user record in DB.
3. Return sanitized user object (exclude password).
`.trim(),
      status: 'todo',
      progress: 0,
      complexity: 7,
      dependencies: [],
      selected: true,
      category: 'Phase 1: Core Features',
      comments: [],
      history: [],
      outputHistory: [],
      type: 'backend'
   });

   // --- CONTEXT SPECIFIC TASKS ---

   if (isEcommerce) {
      // E-COMMERCE TASKS
      tasks.push({
         id: uuidv4(),
         title: 'Frontend: Product Catalog Grid',
         description: `
Objective: Display products in a responsive grid layout.

UI Specifications:
1. Grid Layout:
   - CSS: grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6.
2. Product Card:
   - Image: Aspect ratio 1:1, object-cover.
   - Title: Truncate after 2 lines.
   - Price: Bold, Primary Color.
   - "Add to Cart" Button: Bottom right, icon only on mobile.

Interactions:
- Hover: Slight lift (translate-y-1), Shadow-lg.
- Click: Navigate to /product/:id.

Data Binding:
- Map through "products" array fetched from GET /api/products.
`.trim(),
         status: 'todo', progress: 0, complexity: 6, dependencies: [], selected: true, category: 'Phase 2: Core Business Logic', comments: [], history: [], outputHistory: [], type: 'frontend'
      });

      tasks.push({
         id: uuidv4(),
         title: 'Backend: API - Product Management',
         description: `
Objective: CRUD operations for products.

Endpoints:
1. GET /api/products (Public) - Support pagination (?page=1&limit=10).
2. GET /api/products/:id (Public) - Single item details.
3. POST /api/products (Admin Only) - Create new product.

Request Body (Create):
{
  "title": "String",
  "price": Number,
  "description": "String",
  "inventory": Number,
  "images": ["url1", "url2"]
}

Implementation Details:
- Use Multer or S3 presigned URLs for image uploads.
- Validate price >= 0.
`.trim(),
         status: 'todo', progress: 0, complexity: 7, dependencies: [], selected: true, category: 'Phase 2: Core Business Logic', comments: [], history: [], outputHistory: [], type: 'backend'
      });
   }

   if (isChat) {
      // CHAT TASKS
      tasks.push({
         id: uuidv4(),
         title: 'Frontend: Real-time Chat Interface',
         description: `
Objective: Build a chat window with real-time message updates.

UI Specifications:
1. Message List:
   - Scrollable container (flex-col-reverse or overflow-anchor).
   - Message Bubble:
     - Outgoing: Right aligned, Primary bg, White text.
     - Incoming: Left aligned, Gray bg, Dark text.
2. Input Area:
   - Textarea (auto-resize).
   - Send Button (Icon).

Tech Specs:
- Library: Socket.io-client.
- Event: on('message') -> Append to local state.
`.trim(),
         status: 'todo', progress: 0, complexity: 8, dependencies: [], selected: true, category: 'Phase 2: Core Business Logic', comments: [], history: [], outputHistory: [], type: 'frontend'
      });

      tasks.push({
         id: uuidv4(),
         title: 'Backend: WebSocket Server & Message API',
         description: `
Objective: Handle real-time connections and persist messages.

Tech Specs:
1. Socket.io Setup:
   - cors: { origin: "*" }
   - auth: Handshake with JWT.
2. Events:
   - "join_room": Add socket to room ID.
   - "send_message": Broadcast to room.

Database:
- Schema: Message { content, senderId, roomId, timestamp }.
- API: GET /api/rooms/:id/messages (Load history).
`.trim(),
         status: 'todo', progress: 0, complexity: 9, dependencies: [], selected: true, category: 'Phase 2: Core Business Logic', comments: [], history: [], outputHistory: [], type: 'backend'
      });
   }

   // Default / SaaS Tasks
   if (isSaaS) {
      tasks.push({
         id: uuidv4(),
         title: 'Frontend: Data Analytics Table',
         description: `
Objective: Display tabular data with sorting and filtering.

UI Specifications:
1. Table Component:
   - Headers: Sortable (Click to toggle ASC/DESC).
   - Rows: Hover effect (bg-gray-50 dark:bg-zinc-800).
   - Pagination: "Previous", "Next", Page numbers.
2. Filters:
   - Search Input (Debounced 300ms).
   - Status Dropdown (Active/Inactive).

Data Source:
- Fetch from GET /api/data?sort=name&order=asc&page=1.
`.trim(),
         status: 'todo', progress: 0, complexity: 6, dependencies: [], selected: true, category: 'Phase 2: Core Business Logic', comments: [], history: [], outputHistory: [], type: 'frontend'
      });

      tasks.push({
         id: uuidv4(),
         title: 'Backend: API - Data CRUD Endpoint',
         description: `
Objective: Manage main resource data.

Endpoints:
1. GET /api/items (Protected) - List items.
2. POST /api/items (Protected) - Create item.
3. PUT /api/items/:id (Protected) - Update item.
4. DELETE /api/items/:id (Protected) - Soft delete.

Validation:
- Ensure user owns the organization/team data.
`.trim(),
         status: 'todo', progress: 0, complexity: 6, dependencies: [], selected: true, category: 'Phase 2: Core Business Logic', comments: [], history: [], outputHistory: [], type: 'backend'
      });
   }

   // --- 4. User Profile (Universal) ---
   tasks.push({
      id: uuidv4(),
      title: 'Frontend: User Profile & Settings',
      description: `
Objective: Allow users to manage their account details.

UI Elements:
1. Profile Form:
   - Avatar Upload: Image picker with preview.
   - Name Input: Text, Max 50 chars.
   - Bio: Textarea, resizable vertical only.
2. Settings Switchers:
   - Theme: [Light/Dark] Toggle.
   - Notifications: [Email/Push] Checkboxes.

Validation:
- Image: Max 2MB, .jpg/.png only.
- Save Button: Toast notification "Profile Updated" on success.
`.trim(),
      status: 'todo',
      progress: 0,
      complexity: 4,
      dependencies: [],
      selected: true,
      category: 'Phase 3: Polishing',
      comments: [],
      history: [],
      outputHistory: [],
      type: 'frontend'
   });

   tasks.push({
      id: uuidv4(),
      title: 'Backend: API - User Profile Ops',
      description: `
Objective: Retrieve and update user details.

Endpoints:
1. GET /api/user/profile
   - Auth: Bearer Token.
   - Response: { id, name, email, avatar, preferences }.
2. PUT /api/user/profile
   - Auth: Bearer Token.
   - Body: { name?, avatar?, preferences? }.
   - Logic: Partial update.

Security:
- Ensure users can only update their OWN profile.
`.trim(),
      status: 'todo',
      progress: 0,
      complexity: 4,
      dependencies: [],
      selected: true,
      category: 'Phase 3: Polishing',
      comments: [],
      history: [],
      outputHistory: [],
      type: 'backend'
   });

   return tasks;
};
