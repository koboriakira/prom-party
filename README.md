# Prompt Generation App MVP

This project is an MVP for a prompt generation application based on the specifications in `.github/copilot-instructions.md`. It allows users to create, manage, and use prompt templates, share them publicly, and duplicate existing public templates.

## Features Implemented

*   **User Authentication**: Google OAuth login via Supabase.
*   **Template Management (CRUD)**:
    *   Create, view, edit, and delete personal prompt templates.
    *   Templates include a title, description, and the prompt text with `{{variable}}` placeholders.
*   **Dynamic Input Fields**:
    *   Define custom input fields (text, select, checkbox) for each template, including sort order.
    *   These fields are used to gather inputs for prompt generation.
*   **Tag Management**:
    *   Add and manage tags for each template.
*   **Prompt Generation**:
    *   Dynamically generates a prompt by replacing placeholders with user-provided values from input fields.
    *   "Copy to Clipboard" functionality for the generated prompt.
*   **Template Sharing**:
    *   Users can make their templates public via a toggle.
    *   Public templates have a shareable URL (`index.html?template_id=<ID>`).
*   **Public Template Viewing & Reusing**:
    *   A dedicated section lists all public templates, accessible to both logged-in and logged-out users.
    *   Users can view and use public templates to generate prompts.
*   **Template Duplication (Forking)**:
    *   Logged-in users can duplicate any public template to their own "My Templates" list as a private, editable copy. This includes all fields and tags.
*   **Netlify Functions Setup**:
    *   Basic directory structure (`netlify/functions`) and `netlify.toml` configuration are in place for potential future server-side logic. Includes a placeholder `hello.js` function.

## Tech Stack

*   **Frontend**: HTML, CSS, Vanilla JavaScript
*   **Backend-as-a-Service (BaaS)**: Supabase (Database, Auth, Row Level Security)
*   **Hosting**: Netlify (Static site hosting, Serverless Functions)
*   **Version Control**: Git

## Setup and Run Locally

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Supabase Setup**:
    *   Create a new project on [Supabase](https://supabase.com/).
    *   In your Supabase project's SQL Editor, run the SQL scripts found in the `supabase/migrations/` directory:
        *   First, run `0000_initial_schema.sql` to create the tables.
        *   Then, run `0001_rls_policies.sql` to apply Row Level Security and create helper functions.
    *   Enable Google Auth Provider: In your Supabase Dashboard, go to Authentication > Providers and enable Google. You'll need to configure it with a Google Cloud Platform project's OAuth credentials and set the correct redirect URI (e.g., `https://<your-project-ref>.supabase.co/auth/v1/callback`).

3.  **Configure Application**:
    *   Open `js/app.js`.
    *   Update the `supabaseUrl` and `supabaseAnonKey` variables with your Supabase project's URL and Anon key:
        ```javascript
        const supabaseUrl = 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
        ```
        *(For this project, these are currently hardcoded with the values provided during development. For a production setup, consider environment variables or a build process to manage these.)*

4.  **Run**:
    *   Simply open the `index.html` file in your web browser.
    *   Alternatively, you can use a simple HTTP server (e.g., Python's `http.server`, Node's `live-server`) to serve the root directory.
        ```bash
        # Using Python 3
        python -m http.server
        # Then open http://localhost:8000 in your browser.
        ```

## Deployment

This site is configured for deployment on Netlify.

1.  Push the code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Connect your Git repository to a new site on Netlify.
3.  **Build Settings**:
    *   **Publish directory**: `.` (root)
    *   **Build command**: None needed for this static site.
    *   Netlify will automatically pick up the functions directory from `netlify.toml`.
4.  **Environment Variables**: While the Supabase keys are currently in `js/app.js`, for a production deployment where keys might be managed more securely, you would typically set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the Netlify site's environment variable settings. The current setup will work as is due to the keys being client-side safe and embedded.

## Next Steps / Potential Future Enhancements (from original spec)

*   Template "Fork" count / popularity metrics.
*   User-specific template statistics.
*   Tag popularity rankings.
*   Enhanced search and filtering for public templates.
*   User ratings/favorites for templates.