# World News Painting - Architecture Diagram

```mermaid
graph TB
    %% External Services
    OpenAI[OpenAI API<br/>Image Generation]
    Supabase[(Supabase<br/>Database & Storage)]
    NewsAPI[RSS News Feeds<br/>World News Sources]
    
    %% API Routes Layer
    subgraph API["🔌 API Routes"]
        Generate["/api/generate<br/>Daily Generation<br/>GET"]
        Update["/api/update<br/>Breaking News Check<br/>POST"]
        AdminDebug["/api/admin/debug<br/>Latest Painting Debug<br/>GET"]
        AdminDebugPainting["/api/admin/debug/painting<br/>Specific Painting Debug<br/>GET"]
        AdminLogs["/admin/logs<br/>Admin Logs<br/>GET"]
    end
    
    %% Pages Layer
    subgraph Pages["📄 Pages"]
        Home["/ (Home)<br/>Latest Painting Display"]
        Archive["/archive<br/>Gallery View"]
        PaintingDetail["/painting/[id]<br/>Single Painting View"]
        Process["/process<br/>About & Process"]
    end
    
    %% Components Layer
    subgraph Components["🧩 Components"]
        Frame["Frame<br/>Painting Border"]
        LightCursor["LightCursor<br/>Cursor Glow Effect"]
        NewsReveal["NewsReveal<br/>Show/Hide News Clusters"]
        BodyBackground["BodyBackground<br/>Route-Based Body Classes"]
    end
    
    %% State Management
    subgraph State["⚡ State Management"]
        LocalState["Local Component State<br/>useState hooks"]
        ServerState["Server-Side Data<br/>Next.js App Router"]
    end
    
    %% Data Flow
    NewsAPI -->|Fetch Headlines| Update
    Update -->|Check Breaking News| Supabase
    Update -->|Generate New Image| OpenAI
    Generate -->|Daily Generation| OpenAI
    OpenAI -->|Save Image| Supabase
    
    %% API to Pages
    Supabase -->|Fetch Data| Home
    Supabase -->|Fetch Data| Archive
    Supabase -->|Fetch Data| PaintingDetail
    Supabase -->|Fetch Data| Process
    
    %% Pages to Components
    Home --> Frame
    Home --> LightCursor
    Home --> NewsReveal
    Archive --> LightCursor
    PaintingDetail --> NewsReveal
    Process --> LightCursor
    
    %% Layout Connection
    BodyBackground -.->|Applied Globally| Pages
    
    %% State Connections
    LightCursor -->|uses| LocalState
    NewsReveal -->|uses| LocalState
    BodyBackground -->|uses| LocalState
    Pages -->|fetches| ServerState
    ServerState -->|reads from| Supabase
    
    %% Styling
    classDef apiStyle fill:#e1f5ff,stroke:#0277bd,stroke-width:2px
    classDef pageStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef componentStyle fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef stateStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef serviceStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class Generate,Update,AdminDebug,AdminDebugPainting,AdminLogs apiStyle
    class Home,Archive,PaintingDetail,Process pageStyle
    class Frame,LightCursor,NewsReveal,BodyBackground componentStyle
    class LocalState,ServerState stateStyle
    class OpenAI,Supabase,NewsAPI serviceStyle
```

## Key Architecture Points

### Pages & Routes
- **Home (`/`)**: Displays the latest generated painting with news clusters
- **Archive (`/archive`)**: Grid gallery of historical paintings
- **Painting Detail (`/painting/[id]`)**: Individual painting view with full details
- **Process (`/process`)**: About page showing development history

### Components
- **Frame**: Decorative border wrapper for paintings (used on home page)
- **LightCursor**: Interactive cursor glow effect (used on home, archive, process)
- **NewsReveal**: Collapsible component to show/hide news cluster titles
- **BodyBackground**: Manages route-specific body classes for styling

### API Endpoints
- **`/api/generate`**: Daily scheduled generation (via cron)
- **`/api/update`**: Breaking news check (runs every 120 minutes)
- **`/api/admin/debug`**: Admin tools for debugging latest painting
- **`/api/admin/debug/painting`**: Admin tools for specific painting queries
- **`/admin/logs`**: Admin log viewer

### State Management
- **Local Component State**: Uses React's `useState` for UI interactions (cursor position, reveal toggle, body classes)
- **Server-Side State**: Next.js App Router fetches data server-side from Supabase on page load
- **No Global State Library**: Pure React hooks + server-side data fetching

### Data Flow
1. **News Collection**: RSS feeds → News API → Breaking news detection
2. **Image Generation**: OpenAI API → Generated images → Supabase Storage
3. **Page Rendering**: Supabase → Server-side fetch → Pages → Components

