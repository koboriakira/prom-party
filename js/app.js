console.log("App started.");

// Supabase Client Initialization (assuming these are correct and provided by user)
const supabaseUrl = 'https://bxrucqdkxbzqadejbddl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cnVjcWRreGJ6cWFkZWpiZGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNjQwOTksImV4cCI6MjA2Mzk0MDA5OX0.8Uf7c1yXq_Bcv7MmAj9d6HDZxjKm1ilrkP3FvdN_IxE';

let _supabase; // Declare _supabase here

if (typeof supabase === 'undefined') {
    console.error('Supabase client library not loaded. Make sure the script tag is in index.html.');
    // Display error to user in UI
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.innerHTML = '<p style="color:red;">Error: Application files could not load correctly. Please refresh.</p>';
} else {
    _supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized.");

    // DOM Elements
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfoDiv = document.getElementById('user-info');

    const myTemplatesSection = document.getElementById('my-templates-section');
    const templateEditorSection = document.getElementById('template-editor-section');
    const createNewTemplateButton = document.getElementById('create-new-template-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const templatesListDiv = document.getElementById('templates-list');
    const templateForm = document.getElementById('template-form');
    const editorHeading = document.getElementById('editor-heading');
    const saveTemplateButton = document.getElementById('save-template-button');

    const fieldsEditorDiv = document.getElementById('template-fields-editor');
    const addFieldButton = document.getElementById('add-field-button');

    const tagInputElement = document.getElementById('tag-input');
    const addTagButton = document.getElementById('add-tag-button');
    const currentTagsDiv = document.getElementById('current-tags');

    const promptGenerationSection = document.getElementById('prompt-generation-section');
    const generationTemplateInfoDiv = document.getElementById('generation-template-info');
    const generationFieldsFormDiv = document.getElementById('generation-fields-form');
    const generatedPromptOutputTextarea = document.getElementById('generated-prompt-output');
    const copyPromptButton = document.getElementById('copy-prompt-button');
    const backToMyTemplatesButton = document.getElementById('back-to-my-templates-button');

    const publicTemplatesSection = document.getElementById('public-templates-section');
    const publicTemplatesListDiv = document.getElementById('public-templates-list');

    // State Variables
    let currentEditingTemplateId = null;
    let currentGenerationTemplateData = {
        prompt_template: '',
        fields: [],
        template_title: '',
        template_description: ''
    };

    // --- Utility / Core UI Functions ---
    function hideAllSections() {
        if (myTemplatesSection) myTemplatesSection.style.display = 'none';
        if (templateEditorSection) templateEditorSection.style.display = 'none';
        if (promptGenerationSection) promptGenerationSection.style.display = 'none';
        if (publicTemplatesSection) publicTemplatesSection.style.display = 'none';
    }

    // --- Authentication Functions ---
    async function updateAuthStatus(sessionFromEvent) {
        if (!_supabase) {
            console.error("Supabase client not available in updateAuthStatus.");
            return;
        }

        let sessionToUse = sessionFromEvent;
        let errorGettingSession;

        if (!sessionToUse) {
            const { data: { session }, error } = await _supabase.auth.getSession();
            sessionToUse = session;
            errorGettingSession = error;
        }

        hideAllSections(); // Start by hiding all main content sections

        if (errorGettingSession) {
            console.error("Error getting session:", errorGettingSession.message);
            if (userInfoDiv) userInfoDiv.innerHTML = `<p>Error checking auth status.</p>`;
            if (loginButton) loginButton.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'none';
            if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
            fetchAndDisplayPublicTemplates(); // Show public templates even on auth error
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const templateIdFromUrl = params.get('template_id');

        if (sessionToUse && sessionToUse.user) {
            const user = sessionToUse.user;
            if (userInfoDiv) userInfoDiv.innerHTML = `<p>Logged in as: ${user.email}</p>`;
            if (loginButton) loginButton.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'inline-block';

            if (templateIdFromUrl) {
                const { data: template, error: templateError } = await _supabase
                    .from('templates')
                    .select('*')
                    .eq('id', templateIdFromUrl)
                    .single();

                if (templateError) {
                    console.error('Error fetching template from URL (logged in):', templateError);
                    alert('Error loading template from URL. It might have been removed or the link is incorrect.');
                    window.history.replaceState({}, document.title, window.location.pathname); // Clear URL
                    showMyTemplatesSection();
                } else if (template) {
                    if (template.is_public || template.user_id === user.id) {
                        await handleUseTemplate(template.id);
                    } else {
                        alert('This template is not public and does not belong to you.');
                        window.history.replaceState({}, document.title, window.location.pathname); // Clear URL
                        showMyTemplatesSection();
                    }
                } else { // Template not found
                    alert('Template not found from URL.');
                    window.history.replaceState({}, document.title, window.location.pathname); // Clear URL
                    showMyTemplatesSection();
                }
            } else {
                showMyTemplatesSection();
            }
            if (publicTemplatesSection) publicTemplatesSection.style.display = 'block'; // Ensure it's visible for logged-in users
            fetchAndDisplayPublicTemplates();

        } else { // Not logged in
            if (userInfoDiv) userInfoDiv.innerHTML = '<p>You are not logged in. Browse public templates below or login to create your own.</p>';
            if (loginButton) loginButton.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'none';

            // If there's a template_id in URL and user is not logged in,
            // loadPublicTemplateFromUrl would have been called by the IIFE.
            // If it succeeded, the template view is already set.
            // If it failed, or no template_id, show default public view.
            // This ensures that if a user logs out while viewing a public template via URL, they still see it.
            let publicTemplateLoaded = false;
            if (templateIdFromUrl) {
                 // We don't call loadPublicTemplateFromUrl here again, as IIFE handles initial load.
                 // If user logs out, onAuthStateChange triggers updateAuthStatus.
                 // If a public template was being viewed, we want to keep it.
                 // Check if the current view is already the prompt generation section for that template.
                 // This is a bit of a simplification; ideally, we'd have a more robust state check.
                if (promptGenerationSection && promptGenerationSection.style.display === 'block' &&
                    currentGenerationTemplateData && currentGenerationTemplateData.id === templateIdFromUrl && currentGenerationTemplateData.is_public) {
                    publicTemplateLoaded = true; // Assume it's the one from URL
                }
            }

            if (!publicTemplateLoaded) {
                 if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
            }
            fetchAndDisplayPublicTemplates(); // Always fetch public templates
        }
    }


    async function loadPublicTemplateFromUrl(templateId) {
        if (!_supabase) {
            console.error("Supabase client not available in loadPublicTemplateFromUrl.");
            return false;
        }
        console.log("loadPublicTemplateFromUrl called for template ID:", templateId);
        hideAllSections(); // Hide sections before loading specific template

        const { data: template, error: err } = await _supabase
            .from('templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (err) {
            console.error("Error fetching template by ID for public view:", err);
            alert("Could not load the template. It might have been removed or the link is incorrect.");
            window.history.replaceState({}, document.title, window.location.pathname);
            // Show public templates section as a fallback
            if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
            fetchAndDisplayPublicTemplates();
            return false;
        }

        if (template) {
            if (template.is_public) {
                await handleUseTemplate(template.id); // This function already shows the promptGenerationSection
                // Add template.id and is_public to currentGenerationTemplateData for later checks
                if (currentGenerationTemplateData) {
                    currentGenerationTemplateData.id = template.id;
                    currentGenerationTemplateData.is_public = template.is_public;
                }
                return true;
            } else {
                alert("This template is not public. Please log in if you are the owner.");
                // Do not clear URL here, user might want to log in to access it.
                // Show public templates section as a fallback
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                fetchAndDisplayPublicTemplates();
                return false;
            }
        } else {
            alert("Template not found.");
            window.history.replaceState({}, document.title, window.location.pathname);
            if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
            fetchAndDisplayPublicTemplates();
            return false;
        }
    }


    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            if (!_supabase) return;
            const { error } = await _supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) console.error('Error logging in:', error.message);
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (!_supabase) return;
            const { error } = await _supabase.auth.signOut();
            if (error) console.error('Error logging out:', error.message);
            // onAuthStateChange will handle UI update by calling updateAuthStatus
            // Clearing currentGenerationTemplateData on logout is important if user was viewing a private template
            currentGenerationTemplateData = { prompt_template: '', fields: [], template_title: '', template_description: '', id: null, is_public: false };

        });
    }

    // --- Template CRUD Functions ---
    function showMyTemplatesSection() {
        hideAllSections();
        if (myTemplatesSection) myTemplatesSection.style.display = 'block';
        console.log("Showing My Templates section and fetching templates.");
        fetchAndDisplayUserTemplates();
    }

    async function fetchAndDisplayUserTemplates() {
        if (!templatesListDiv || !_supabase) return;
        templatesListDiv.innerHTML = '<p>Loading templates...</p>';

        const { data: { session } } = await _supabase.auth.getSession();
        if (!session || !session.user) {
            templatesListDiv.innerHTML = '<p>Please login to see your templates.</p>';
            return;
        }
        const userId = session.user.id;

        const { data, error } = await _supabase
            .from('templates')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            templatesListDiv.innerHTML = '<p>Error loading templates. Check console.</p>';
        } else {
            renderTemplates(data, userId); // Pass userId for RLS checks in event handlers
        }
    }

    function renderTemplates(templatesData, currentUserId) {
        if (!templatesListDiv) return;
        templatesListDiv.innerHTML = '';

        if (!templatesData || templatesData.length === 0) {
            templatesListDiv.innerHTML = '<p>No templates yet. Create one!</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.padding = '0';

        templatesData.forEach(template => {
            const li = document.createElement('li');
            li.className = 'template-list-item'; // Added for easier styling/selection
            li.style.border = '1px solid #eee';
            li.style.padding = '10px';
            li.style.marginBottom = '10px';
            li.style.borderRadius = '4px';

            const titleEl = document.createElement('h4');
            titleEl.textContent = template.title;
            titleEl.style.marginTop = '0';
            li.appendChild(titleEl);

            const descriptionEl = document.createElement('p');
            descriptionEl.textContent = template.description || 'No description.';
            li.appendChild(descriptionEl);

            const promptSnippetEl = document.createElement('p');
            promptSnippetEl.className = 'prompt-snippet';
            promptSnippetEl.style.fontFamily = 'monospace';
            promptSnippetEl.style.fontSize = '0.9em';
            promptSnippetEl.style.color = '#555';
            promptSnippetEl.textContent = 'Prompt: ' + (template.prompt_template ? template.prompt_template.substring(0, 70) + '...' : 'Not set');
            li.appendChild(promptSnippetEl);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'template-actions';
            actionsDiv.style.marginTop = "10px";

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.setAttribute('data-template-id', template.id);
            editButton.style.marginRight = '5px';
            editButton.addEventListener('click', () => handleEditTemplate(template.id));
            actionsDiv.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.setAttribute('data-template-id', template.id);
            deleteButton.style.marginRight = '5px';
            deleteButton.addEventListener('click', () => handleDeleteTemplate(template.id));
            actionsDiv.appendChild(deleteButton);

            const useButton = document.createElement('button');
            useButton.textContent = 'Use';
            useButton.setAttribute('data-template-id', template.id);
            useButton.style.marginRight = '5px';
            useButton.addEventListener('click', () => handleUseTemplate(template.id));
            actionsDiv.appendChild(useButton);

            // Share Toggle
            const shareContainer = document.createElement('div');
            shareContainer.style.marginTop = '10px';
            shareContainer.style.display = 'inline-block'; // Keep it on same line as buttons if space allows

            const shareLabelText = document.createElement('span');
            shareLabelText.textContent = 'Share: ';
            shareContainer.appendChild(shareLabelText);

            const shareToggleLabel = document.createElement('label');
            shareToggleLabel.className = 'share-toggle-label';

            const shareCheckbox = document.createElement('input');
            shareCheckbox.type = 'checkbox';
            shareCheckbox.checked = template.is_public;

            const shareSlider = document.createElement('span');
            shareSlider.className = 'share-slider';

            shareToggleLabel.appendChild(shareCheckbox);
            shareToggleLabel.appendChild(shareSlider);
            shareContainer.appendChild(shareToggleLabel);
            actionsDiv.appendChild(shareContainer); // Add toggle to actions

            const shareUrlDisplay = document.createElement('div');
            shareUrlDisplay.className = 'share-url-display';
            shareUrlDisplay.style.display = template.is_public ? 'block' : 'none';
            shareUrlDisplay.style.marginTop = '5px'; // Space it out a bit
            if (template.is_public) {
                shareUrlDisplay.textContent = `URL: ${window.location.origin}${window.location.pathname}?template_id=${template.id}`;
            }
            actionsDiv.appendChild(shareUrlDisplay); // Add URL display to actions

            shareCheckbox.addEventListener('change', async (event) => {
                const newIsPublicState = event.target.checked;
                // currentUserId is passed to renderTemplates from fetchAndDisplayUserTemplates
                if (!currentUserId) {
                    alert("User ID not found. Cannot change sharing status.");
                    event.target.checked = !newIsPublicState; return;
                }

                const { error: updateShareError } = await _supabase
                    .from('templates')
                    .update({ is_public: newIsPublicState, updated_at: new Date() })
                    .eq('id', template.id)
                    .eq('user_id', currentUserId);

                if (updateShareError) {
                    console.error("Error updating sharing status:", updateShareError);
                    alert("Failed to update sharing status: " + updateShareError.message);
                    event.target.checked = !newIsPublicState;
                } else {
                    template.is_public = newIsPublicState;
                    if (newIsPublicState) {
                        shareUrlDisplay.textContent = `URL: ${window.location.origin}${window.location.pathname}?template_id=${template.id}`;
                        shareUrlDisplay.style.display = 'block';
                    } else {
                        shareUrlDisplay.style.display = 'none';
                        shareUrlDisplay.textContent = '';
                    }
                }
            });

            li.appendChild(actionsDiv);
            ul.appendChild(li);
        });
        templatesListDiv.appendChild(ul);
    }

    function showTemplateEditorSection(templateDataToEdit = null) {
        hideAllSections();
        if (templateEditorSection) templateEditorSection.style.display = 'block';

        if (templateDataToEdit && currentEditingTemplateId) {
            if (editorHeading) editorHeading.textContent = 'Edit Template';
            if (saveTemplateButton) saveTemplateButton.textContent = 'Update Template';
            // Form population is handled by handleEditTemplate
        } else {
            currentEditingTemplateId = null;
            if (editorHeading) editorHeading.textContent = 'Create New Template';
            if (saveTemplateButton) saveTemplateButton.textContent = 'Save Template';
            if (templateForm) templateForm.reset();

            if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>No fields defined yet. Click "Add Field".</p>';
            if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>No tags yet.</span>';
            if (tagInputElement) tagInputElement.value = '';
        }
        console.log("Showing Template Editor section. Editing ID:", currentEditingTemplateId);
    }

    async function handleEditTemplate(templateId) {
        console.log("Editing template ID:", templateId);
        const { data: template, error } = await _supabase
            .from('templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) { console.error('Error fetching template for edit:', error); alert('Could not fetch template details. ' + error.message); return; }

        if (template) {
            currentEditingTemplateId = template.id;
            document.getElementById('template-title').value = template.title;
            document.getElementById('template-description').value = template.description || '';
            document.getElementById('template-prompt').value = template.prompt_template;

            // Fetch and render fields
            if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>Loading fields...</p>';
            const { data: fields, error: fieldsError } = await _supabase
                .from('fields')
                .select('*')
                .eq('template_id', templateId)
                .order('sort_order', { ascending: true });

            if (fieldsError) {
                console.error('Error fetching fields:', fieldsError);
                if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>Error loading fields.</p>';
            } else {
                if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '';
                if (fields && fields.length > 0) { fields.forEach(field => renderFieldEditorGroup(field)); }
                else { if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>No fields defined yet. Click "Add Field".</p>'; }
            }

            // Fetch and render tags
            if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>Loading tags...</span>';
            const { data: templateTagLinks, error: ttError } = await _supabase
                .from('template_tags')
                .select('tag_id')
                .eq('template_id', templateId);

            if (ttError) {
                console.error("Error fetching template_tag links:", ttError);
                if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>Error loading tags.</span>';
            } else if (templateTagLinks && templateTagLinks.length > 0) {
                const tagIds = templateTagLinks.map(link => link.tag_id);
                const { data: tagsData, error: tagsError } = await _supabase.from('tags').select('id, name').in('id', tagIds);
                if (tagsError) { console.error("Error fetching tags:", tagsError); if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>Error loading tags.</span>'; }
                else if (tagsData) {
                    if (currentTagsDiv) currentTagsDiv.innerHTML = '';
                    if (tagsData.length === 0) currentTagsDiv.innerHTML = '<span>No tags yet.</span>';
                    else tagsData.forEach(tag => renderTag(tag.name, true));
                }
            } else {
                if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>No tags yet.</span>';
            }

            showTemplateEditorSection(template);
        }
    }

    async function handleDeleteTemplate(templateId) {
        if (!templateId) { console.error("No template ID provided for deletion."); return; }
        if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;

        const { data: { session } } = await _supabase.auth.getSession();
        if (!session || !session.user) { alert('You must be logged in.'); return; }
        const userId = session.user.id;

        const { error } = await _supabase.from('templates').delete().eq('id', templateId).eq('user_id', userId);
        if (error) { console.error('Error deleting template:', error); alert(`Error deleting template: ${error.message}`); }
        else { console.log('Template deleted:', templateId); alert('Template deleted.'); fetchAndDisplayUserTemplates(); }
    }

    if (templateForm) {
        templateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session || !session.user) { alert('You must be logged in.'); return; }
            const userId = session.user.id;

            const title = document.getElementById('template-title').value.trim();
            const description = document.getElementById('template-description').value.trim();
            const prompt_template = document.getElementById('template-prompt').value.trim();

            if (!title || !prompt_template) { alert('Title and Prompt Template are required.'); return; }

            let savedTemplateId = currentEditingTemplateId;
            let mainOpSuccess = false;

            if (currentEditingTemplateId) { // Update
                const { data: tData, error: tError } = await _supabase.from('templates')
                    .update({ title, description, prompt_template, updated_at: new Date() })
                    .eq('id', currentEditingTemplateId).eq('user_id', userId).select().single();
                if (tError) { console.error('Err updating template:', tError); alert(`Err: ${tError.message}`); return; }
                console.log('Template updated:', tData); savedTemplateId = tData.id; mainOpSuccess = true;
            } else { // Create
                const { data: tData, error: tError } = await _supabase.from('templates')
                    .insert([{ user_id: userId, title, description, prompt_template }]).select().single();
                if (tError) { console.error('Err saving template:', tError); alert(`Err: ${tError.message}`); return; }
                console.log('Template saved:', tData); savedTemplateId = tData.id; mainOpSuccess = true;
            }

            if (!mainOpSuccess || !savedTemplateId) { alert("Failed to save template data."); return; }

            // Fields processing
            const fieldGroups = fieldsEditorDiv.querySelectorAll('.field-group');
            const fieldsToSave = []; let fieldValidationError = false;
            fieldGroups.forEach((group, index) => {
                const name = group.querySelector('.field-name').value.trim();
                const label = group.querySelector('.field-label').value.trim();
                const type = group.querySelector('.field-type').value;
                const sort_order = parseInt(group.querySelector('.field-sort-order').value, 10) || index;
                if (!name || !label) { fieldValidationError = true; }
                let options = null;
                if (type === 'select') {
                    const optStr = group.querySelector('.field-options').value.trim();
                    if (!optStr) { fieldValidationError = true; } else { options = optStr.split(',').map(o => o.trim()).filter(o => o); if (options.length === 0) fieldValidationError = true; }
                }
                if (fieldValidationError) return;
                fieldsToSave.push({ template_id: savedTemplateId, name, label, type, options, sort_order });
            });

            if (fieldValidationError) { alert("Field validation failed. Correct and save again."); currentEditingTemplateId = savedTemplateId; return; }

            const { error: delFieldsError } = await _supabase.from('fields').delete().eq('template_id', savedTemplateId);
            if (delFieldsError) { console.error("Err deleting old fields", delFieldsError); alert("Err clearing old fields. Try save again."); currentEditingTemplateId = savedTemplateId; return; }
            if (fieldsToSave.length > 0) {
                const { error: insFieldsError } = await _supabase.from('fields').insert(fieldsToSave);
                if (insFieldsError) { console.error("Err saving fields", insFieldsError); alert("Err saving fields. Try save again."); currentEditingTemplateId = savedTemplateId; return; }
            }
            console.log("Fields saved for template:", savedTemplateId);

            // Tags processing
            const tagDisplayElements = currentTagsDiv.querySelectorAll('.tag-display');
            const uiTagNames = Array.from(tagDisplayElements).map(el => el.getAttribute('data-tag-name'));
            const validTagIds = []; let tagProcessingError = false;

            if (uiTagNames.length > 0) {
                for (const tagName of uiTagNames) {
                    let { data: exTag, error: selTagErr } = await _supabase.from('tags').select('id').eq('name', tagName).single();
                    if (selTagErr && selTagErr.code !== 'PGRST116') { console.error(`Err chk tag ${tagName}:`, selTagErr); tagProcessingError = true; continue; }
                    if (exTag) { validTagIds.push(exTag.id); }
                    else {
                        let { data: newTag, error: insNewTagErr } = await _supabase.from('tags').insert({ name: tagName }).select('id').single();
                        if (insNewTagErr) { console.error(`Err ins tag ${tagName}:`, insNewTagErr); tagProcessingError = true; continue; }
                        if (newTag) validTagIds.push(newTag.id);
                    }
                }
            }
            if (tagProcessingError) { alert('Partial success: Issue processing some tags. Review and save again if needed.'); }

            const { error: delOldLinksErr } = await _supabase.from('template_tags').delete().eq('template_id', savedTemplateId);
            if (delOldLinksErr) { console.error('Err del old t_tags:', delOldLinksErr); alert('Err clearing old tags. Save again.'); currentEditingTemplateId = savedTemplateId; return; }
            if (validTagIds.length > 0) {
                const linksToSave = validTagIds.map(tagId => ({ template_id: savedTemplateId, tag_id: tagId }));
                const { error: insNewLinksErr } = await _supabase.from('template_tags').insert(linksToSave);
                if (insNewLinksErr) { console.error('Err ins t_tags:', insNewLinksErr); alert('Err saving tags. Save again.'); currentEditingTemplateId = savedTemplateId; return; }
            }
            console.log("Tags saved for template:", savedTemplateId);

            alert('Template, fields, and tags processed successfully!');
            currentEditingTemplateId = null; templateForm.reset();
            if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>No fields defined yet.</p>';
            if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>No tags yet.</span>';
            if (tagInputElement) tagInputElement.value = '';
            showMyTemplatesSection();
        });
    }

    // --- Field Editor UI Functions ---
    function renderFieldEditorGroup(fieldData = null) {
        if (!fieldsEditorDiv) return null;
        // Clear placeholder only if it exists and we are about to add the first real group
        if (fieldsEditorDiv.children.length === 1 && fieldsEditorDiv.querySelector('p')) {
            fieldsEditorDiv.innerHTML = '';
        }

        const fieldGroup = document.createElement('div'); fieldGroup.className = 'field-group';
        fieldGroup.style.border = '1px solid #ddd'; fieldGroup.style.padding = '10px';
        fieldGroup.style.marginBottom = '10px'; fieldGroup.style.borderRadius = '4px';

        const idInput = document.createElement('input'); idInput.type = 'hidden'; idInput.className = 'field-id'; idInput.value = fieldData ? fieldData.id : ''; fieldGroup.appendChild(idInput);

        // Sort Order
        const sortOrderDiv = document.createElement('div');
        const sortOrderLabel = document.createElement('label'); sortOrderLabel.textContent = 'Sort Order: ';
        const sortOrderInput = document.createElement('input'); sortOrderInput.type = 'number'; sortOrderInput.className = 'field-sort-order'; sortOrderInput.value = fieldData ? fieldData.sort_order : '0'; sortOrderInput.style.width = '60px';
        sortOrderLabel.appendChild(sortOrderInput); sortOrderDiv.appendChild(sortOrderLabel); fieldGroup.appendChild(sortOrderDiv);

        // Name
        const nameDiv = document.createElement('div');
        const nameLabelEl = document.createElement('label'); nameLabelEl.textContent = 'Name (for {{variable}}): ';
        const nameInputEl = document.createElement('input'); nameInputEl.type = 'text'; nameInputEl.className = 'field-name'; nameInputEl.required = true; nameInputEl.value = fieldData ? fieldData.name : '';
        nameLabelEl.appendChild(nameInputEl); nameDiv.appendChild(nameLabelEl); fieldGroup.appendChild(nameDiv);

        // Label
        const labelDiv = document.createElement('div');
        const labelLabelEl = document.createElement('label'); labelLabelEl.textContent = 'Label (UI display): ';
        const labelInputEl = document.createElement('input'); labelInputEl.type = 'text'; labelInputEl.className = 'field-label'; labelInputEl.required = true; labelInputEl.value = fieldData ? fieldData.label : '';
        labelLabelEl.appendChild(labelInputEl); labelDiv.appendChild(labelLabelEl); fieldGroup.appendChild(labelDiv);

        // Type
        const typeDiv = document.createElement('div');
        const typeLabel = document.createElement('label'); typeLabel.textContent = 'Type: ';
        const typeSelect = document.createElement('select'); typeSelect.className = 'field-type';
        ['text', 'select', 'checkbox'].forEach(typeValue => {
            const option = document.createElement('option'); option.value = typeValue; option.textContent = typeValue.charAt(0).toUpperCase() + typeValue.slice(1);
            if (fieldData && fieldData.type === typeValue) option.selected = true;
            typeSelect.appendChild(option);
        });
        typeLabel.appendChild(typeSelect); typeDiv.appendChild(typeLabel); fieldGroup.appendChild(typeDiv);

        // Options
        const optionsWrapper = document.createElement('div'); optionsWrapper.className = 'field-options-wrapper';
        // optionsWrapper.style.display = (fieldData && fieldData.type === 'select') ? 'block' : 'none'; // Initial display set by event listener
        const optionsLabel = document.createElement('label'); optionsLabel.textContent = 'Options (comma-separated): ';
        const optionsInputEl = document.createElement('input'); optionsInputEl.type = 'text'; optionsInputEl.className = 'field-options';
        if (fieldData && fieldData.type === 'select' && fieldData.options) {
            optionsInputEl.value = Array.isArray(fieldData.options) ? fieldData.options.join(',') : (fieldData.options || '');
        }
        optionsLabel.appendChild(optionsInputEl); optionsWrapper.appendChild(optionsLabel); fieldGroup.appendChild(optionsWrapper);

        typeSelect.addEventListener('change', () => { optionsWrapper.style.display = typeSelect.value === 'select' ? 'block' : 'none'; });
        // Trigger change event to set initial state of options visibility
        if (fieldData && fieldData.type === 'select') optionsWrapper.style.display = 'block'; else optionsWrapper.style.display = 'none';


        const removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.textContent = 'Remove Field'; removeButton.style.marginTop = '5px';
        removeButton.addEventListener('click', () => { fieldGroup.remove(); if (fieldsEditorDiv.children.length === 0) fieldsEditorDiv.innerHTML = '<p>No fields defined yet.</p>'; });
        fieldGroup.appendChild(removeButton);

        fieldsEditorDiv.appendChild(fieldGroup); return fieldGroup;
    }

    if (addFieldButton) { addFieldButton.addEventListener('click', () => renderFieldEditorGroup()); }

    // --- Tag Editor UI Functions ---
    function renderTag(tagName, isExisting = false) {
        if (!currentTagsDiv) return;
        const noTagsMsg = currentTagsDiv.querySelector('span'); if (noTagsMsg && noTagsMsg.textContent.includes('No tags')) currentTagsDiv.innerHTML = '';
        const existingSpans = currentTagsDiv.querySelectorAll('.tag-display span');
        for (let span of existingSpans) {
            if (span.textContent.toLowerCase() === tagName.toLowerCase()) {
                if (tagInputElement) tagInputElement.value = ''; return;
            }
        }
        const display = document.createElement('div'); display.className = 'tag-display'; display.setAttribute('data-tag-name', tagName);
        display.style.display = 'inline-flex'; display.style.alignItems = 'center'; display.style.backgroundColor = '#e0e0e0';
        display.style.padding = '3px 8px'; display.style.marginRight = '5px'; display.style.marginBottom = '5px'; display.style.borderRadius = '4px';
        const nameSpan = document.createElement('span'); nameSpan.textContent = tagName; display.appendChild(nameSpan);
        const removeBtn = document.createElement('button'); removeBtn.textContent = 'x';
        removeBtn.style.marginLeft = '5px'; removeBtn.style.border = 'none'; removeBtn.style.background = 'none';
        removeBtn.style.cursor = 'pointer'; removeBtn.style.fontSize = '14px'; removeBtn.style.padding = '0 5px';
        removeBtn.addEventListener('click', () => { display.remove(); if (currentTagsDiv.children.length === 0) currentTagsDiv.innerHTML = '<span>No tags yet.</span>'; });
        display.appendChild(removeBtn); currentTagsDiv.appendChild(display);
    }

    if (addTagButton) { addTagButton.addEventListener('click', () => { if (tagInputElement) { const name = tagInputElement.value.trim(); if (name) { renderTag(name); tagInputElement.value = ''; } } }); }
    if (tagInputElement) { tagInputElement.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTagButton.click(); } }); }

    // --- Prompt Generation Functions ---
    function showPromptGenerationSection() {
        hideAllSections();
        if (promptGenerationSection) promptGenerationSection.style.display = 'block';
    }

    function renderGenerationField(field) {
        const container = document.createElement('div'); container.style.marginBottom = '10px';
        const label = document.createElement('label'); label.textContent = field.label + ': '; label.style.display = 'block'; container.appendChild(label);
        let input;
        if (field.type === 'text') { input = document.createElement('input'); input.type = 'text'; }
        else if (field.type === 'select') { input = document.createElement('select'); if (field.options && Array.isArray(field.options)) field.options.forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; input.appendChild(o); }); }
        else if (field.type === 'checkbox') { input = document.createElement('input'); input.type = 'checkbox'; input.value = field.label; } // Use field.label as value for checkbox
        else { input = document.createElement('input'); input.type = 'text'; } // Default to text
        input.id = `gen-field-${field.name}`; input.className = 'generation-input-field'; input.setAttribute('data-field-name', field.name);
        input.addEventListener('input', regenerateDynamicPrompt); input.addEventListener('change', regenerateDynamicPrompt);
        container.appendChild(input); return container;
    }

    async function handleUseTemplate(templateId) {
        console.log("Using template ID:", templateId);
        const { data: t, error: tE } = await _supabase.from('templates').select('*').eq('id', templateId).single();
        if (tE) { console.error("Err fetch template for gen:", tE); alert("Could not load template: " + tE.message); return; }
        const { data: f, error: fE } = await _supabase.from('fields').select('*').eq('template_id', templateId).order('sort_order');
        if (fE) { console.error("Err fetch fields for gen:", fE); alert("Could not load fields: " + fE.message); return; }
        
        currentGenerationTemplateData = { 
            prompt_template: t.prompt_template, 
            fields: f || [], 
            template_title: t.title, 
            template_description: t.description,
            id: t.id, // Store id and is_public for state checking
            is_public: t.is_public
        };

        if (generationTemplateInfoDiv) generationTemplateInfoDiv.innerHTML = `<h3>${t.title}</h3><p>${t.description || ''}</p>`;
        if (generationFieldsFormDiv) { generationFieldsFormDiv.innerHTML = ''; if (f && f.length > 0) f.forEach(field => generationFieldsFormDiv.appendChild(renderGenerationField(field))); else generationFieldsFormDiv.innerHTML = '<p>No input fields.</p>'; }
        if (generatedPromptOutputTextarea) generatedPromptOutputTextarea.value = '';
        regenerateDynamicPrompt(); 
        showPromptGenerationSection();
    }

    function regenerateDynamicPrompt() {
        if (!generatedPromptOutputTextarea || !currentGenerationTemplateData) return;
        let promptText = currentGenerationTemplateData.prompt_template || '';
        currentGenerationTemplateData.fields.forEach(field => {
            const inputEl = document.getElementById(`gen-field-${field.name}`);
            if (inputEl) {
                let val = '';
                if (inputEl.type === 'checkbox') { if (inputEl.checked) val = inputEl.value || field.label; }
                else { val = inputEl.value; }
                if (val) { const regex = new RegExp(`\{\{\s*${field.name}\s*\}\}`, 'g'); promptText = promptText.replace(regex, val); }
            }
        });
        promptText = promptText.replace(/\{\{\s*[^}]+\s*\}\}/g, '[...]');
        generatedPromptOutputTextarea.value = promptText;
    }

    if (copyPromptButton) {
        copyPromptButton.addEventListener('click', async () => {
            if (!generatedPromptOutputTextarea) return; const text = generatedPromptOutputTextarea.value; if (!text) { alert("Nothing to copy"); return; }
            if (navigator.clipboard && navigator.clipboard.writeText) { try { await navigator.clipboard.writeText(text); copyPromptButton.textContent = 'Copied!'; setTimeout(() => copyPromptButton.textContent = 'Copy Prompt', 2000); } catch (err) { console.error("Fail copy", err); alert("Fail copy"); } }
            else { try { generatedPromptOutputTextarea.select(); document.execCommand('copy'); generatedPromptOutputTextarea.blur(); copyPromptButton.textContent = 'Copied!'; setTimeout(() => copyPromptButton.textContent = 'Copy Prompt', 2000); } catch (err) { alert("Fail copy (fallback)"); } }
        });
    }
    if (backToMyTemplatesButton) { 
        backToMyTemplatesButton.addEventListener('click', async () => {
            // Determine if user is logged in to decide which section to show
            const { data: { session } } = await _supabase.auth.getSession();
            if (session && session.user) {
                showMyTemplatesSection();
            } else {
                // If not logged in, and they clicked "back", they were likely viewing a public template.
                // Show the public templates list.
                hideAllSections();
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                fetchAndDisplayPublicTemplates(); // Ensure public templates are visible
            }
        });
    }

    // --- Public Templates Display Functions ---
    function renderPublicTemplates(templatesData) {
        if (!publicTemplatesListDiv) return; publicTemplatesListDiv.innerHTML = '';
        if (!templatesData || templatesData.length === 0) { publicTemplatesListDiv.innerHTML = '<p>No public templates available at the moment.</p>'; return; }
        const ul = document.createElement('ul'); ul.style.listStyleType = 'none'; ul.style.padding = '0';
        templatesData.forEach(t => {
            const li = document.createElement('li'); li.style.border = '1px solid #eee'; li.style.padding = '10px'; li.style.marginBottom = '10px';
            const h4 = document.createElement('h4'); h4.textContent = t.title; li.appendChild(h4);
            const p = document.createElement('p'); p.textContent = t.description || 'No description.'; li.appendChild(p);
            // Later: author, tags.
            const btn = document.createElement('button'); btn.textContent = 'View & Use'; btn.setAttribute('data-template-id', t.id);
            btn.addEventListener('click', () => handleUseTemplate(t.id)); 
            li.appendChild(btn); ul.appendChild(li);
        });
        publicTemplatesListDiv.appendChild(ul);
    }

    async function fetchAndDisplayPublicTemplates() {
        if (!publicTemplatesListDiv || !_supabase) return; 
        // Avoid multiple "Loading..." messages if already loading or content is present
        if (!publicTemplatesListDiv.innerHTML || publicTemplatesListDiv.innerHTML.includes('<p>Loading public templates...</p>')) {
             publicTemplatesListDiv.innerHTML = '<p>Loading public templates...</p>';
        }

        const { data, error } = await _supabase.from('templates').select('id,title,description,user_id,is_public').eq('is_public', true).order('created_at', { ascending: false });
        if (error) { 
            console.error("Error fetching public templates:", error); 
            if (publicTemplatesListDiv.innerHTML.includes('<p>Loading public templates...</p>')) { // Only overwrite if still loading
                 publicTemplatesListDiv.innerHTML = '<p>Error loading public templates. Please try again later.</p>'; 
            }
        }
        else { renderPublicTemplates(data); }
    }

    // --- Initial Load & Auth State Change Handler ---
    _supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth event:", event, "Session:", session);
        await updateAuthStatus(session);
    });

    // Initial page load execution
    (async () => {
        if (!_supabase) {
            console.error("Supabase client not initialized at initial page load. Cannot proceed.");
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const templateIdFromUrl = params.get('template_id');

        if (templateIdFromUrl) {
            // Quickly check if a session exists.
            // This helps in scenarios where onAuthStateChange might be delayed or already fired.
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session || !session.user) {
                // No active session, try to load as public template.
                // updateAuthStatus (triggered by onAuthStateChange or if already run for INITIAL_SESSION)
                // will handle showing public templates section if this fails.
                await loadPublicTemplateFromUrl(templateIdFromUrl);
            }
            // If session exists, updateAuthStatus (called by onAuthStateChange)
            // will handle the template_id from URL for logged-in user.
        } else {
            // No template_id in URL.
            // Call updateAuthStatus manually if onAuthStateChange hasn't fired yet for INITIAL_SESSION.
            // This ensures the UI (like public templates) is populated on initial load
            // especially if there's no interaction triggering onAuthStateChange immediately.
            // We get the session first to avoid redundant calls if updateAuthStatus is also called by onAuthStateChange.
            const { data: { session } } = await _supabase.auth.getSession();
            await updateAuthStatus(session); // updateAuthStatus can handle null session
        }
    })();

    // Event listeners for global buttons
    if (createNewTemplateButton) {
        createNewTemplateButton.addEventListener('click', () => {
            currentEditingTemplateId = null; // Ensure it's a new template
            showTemplateEditorSection(); // Pass no arg for new template
        });
    }
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', async () => {
            currentEditingTemplateId = null; // Clear editing state
            // Decide where to go back based on login state
            const { data: { session } } = await _supabase.auth.getSession();
            if (session && session.user) {
                showMyTemplatesSection();
            } else {
                hideAllSections();
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                fetchAndDisplayPublicTemplates();
            }
        });
    }
}
