console.log("App started.");

// Supabase Client Initialization (assuming these are correct and provided by user)
const supabaseUrl = 'https://bxrucqdkxbzqadejbddl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cnVjcWRreGJ6cWFkZWpiZGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNjQwOTksImV4cCI6MjA2Mzk0MDA5OX0.8Uf7c1yXq_Bcv7MmAj9d6HDZxjKm1ilrkP3FvdN_IxE';

let _supabase; // Declare _supabase here

if (typeof supabase === 'undefined') {
    console.error('Supabase client library not loaded. Make sure the script tag is in index.html.');
    // Display error to user in UI
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.innerHTML = '<p style="color:red;">エラー: アプリケーションファイルを正しく読み込めませんでした。ページを更新してください。</p>';
} else {
    try {
        _supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
        console.log("Supabase client initialized successfully.");
    } catch (e) {
        console.error("CRITICAL: Supabase client failed to initialize:", e);
        // Display error to user in UI
        const mainContent = document.querySelector('main');
        if (mainContent) mainContent.innerHTML = '<p style="color:red;">重大なエラー: 認証サービスを読み込めませんでした。ページを更新するか、サポートにお問い合わせください。</p>';
        // return; // Stop further execution - this return would be outside a function, so we'll rely on _supabase being undefined
    }

    if (!_supabase) { // Check if _supabase failed to initialize
        console.error("Stopping app execution as Supabase client is not available.");
    } else {

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

        // Tooltip Elements
        const tooltipTrigger = document.getElementById('tooltip-trigger');
        const syntaxGuideTooltip = document.getElementById('syntax-guide-tooltip');

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
            if (sessionFromEvent === undefined) {
                console.log("updateAuthStatus called with UNDEFINED session. Will call getSession().");
            } else if (sessionFromEvent === null) {
                console.log("updateAuthStatus called with NULL session.");
            } else {
                console.log("updateAuthStatus called. Session user:", sessionFromEvent.user ? sessionFromEvent.user.email : 'Session object present but no user object');
            }

            if (!_supabase) {
                console.error("Supabase client not available in updateAuthStatus.");
                return;
            }

            let sessionToUse = sessionFromEvent;
            let errorGettingSession;

            if (sessionToUse === undefined) { 
                console.log("updateAuthStatus: sessionFromEvent is undefined, calling _supabase.auth.getSession().");
                const { data: { session }, error } = await _supabase.auth.getSession();
                sessionToUse = session; 
                errorGettingSession = error;
                if(error) console.error("updateAuthStatus: Error from getSession():", error);
                if(session) console.log("updateAuthStatus: Session from getSession():", session.user ? session.user.email : 'session but no user'); else console.log("updateAuthStatus: No session from getSession().");
            }

            hideAllSections(); 

            if (errorGettingSession) {
                console.error("Error getting session in updateAuthStatus:", errorGettingSession.message);
                if (userInfoDiv) userInfoDiv.innerHTML = `<p>認証ステータスの確認中にエラーが発生しました。</p>`;
                if (loginButton) loginButton.style.display = 'inline-block';
                if (logoutButton) logoutButton.style.display = 'none';
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                fetchAndDisplayPublicTemplates(); 
                return;
            }

            const params = new URLSearchParams(window.location.search);
            const templateIdFromUrl = params.get('template_id');
            if(templateIdFromUrl) console.log("updateAuthStatus: template_id from URL query param is", templateIdFromUrl);


            if (sessionToUse && sessionToUse.user) {
                const user = sessionToUse.user;
                console.log("updateAuthStatus: User is logged in:", user.email);
                if (userInfoDiv) userInfoDiv.innerHTML = `<p>ログインユーザー: ${user.email}</p>`;
                if (loginButton) loginButton.style.display = 'none';
                if (logoutButton) logoutButton.style.display = 'inline-block';

                if (templateIdFromUrl) {
                    console.log("updateAuthStatus: Logged in user, attempting to load template from URL query param:", templateIdFromUrl);
                    const { data: template, error: templateError } = await _supabase
                        .from('templates')
                        .select('*')
                        .eq('id', templateIdFromUrl)
                        .single();

                    if (templateError) {
                        console.error('updateAuthStatus: Error fetching template from URL (logged in):', templateError);
                        alert('URLからのテンプレートの読み込み中にエラーが発生しました。削除されたか、リンクが間違っている可能性があります。');
                        window.history.replaceState({}, document.title, window.location.pathname); 
                        showMyTemplatesSection();
                    } else if (template) {
                        console.log("updateAuthStatus: Template data fetched from URL:", template);
                        if (template.is_public || template.user_id === user.id) {
                            console.log("updateAuthStatus: Template is public or owned by user, calling handleUseTemplate.");
                            await handleUseTemplate(template.id);
                        } else {
                            console.warn("updateAuthStatus: Template is not public and not owned by user.");
                            alert('このテンプレートは公開されておらず、あなたのものではありません。');
                            window.history.replaceState({}, document.title, window.location.pathname); 
                            showMyTemplatesSection();
                        }
                    } else { 
                        console.warn("updateAuthStatus: Template not found from URL (logged in).");
                        alert('URLからテンプレートが見つかりませんでした。');
                        window.history.replaceState({}, document.title, window.location.pathname); 
                        showMyTemplatesSection();
                    }
                } else {
                    console.log("updateAuthStatus: Logged in user, no template_id in URL query param. Showing My Templates.");
                    showMyTemplatesSection();
                }
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block'; 
                fetchAndDisplayPublicTemplates();

            } else { // Not logged in
                console.log("updateAuthStatus: User is not logged in.");
                if (userInfoDiv) userInfoDiv.innerHTML = '<p>ログインしていません。以下の公開テンプレートを閲覧するか、ログインして独自のテンプレートを作成してください。</p>';
                if (loginButton) loginButton.style.display = 'inline-block';
                if (logoutButton) logoutButton.style.display = 'none';

                let publicTemplateLoadedViaUrlQuery = false;
                if (templateIdFromUrl) {
                     // This case (not logged in, template_id in query) should have been handled by loadPublicTemplateFromUrl in IIFE.
                     // If we are here, it means either loadPublicTemplateFromUrl decided not to show it (e.g. not public)
                     // or it was loaded but then some other auth event (like logout) brought us here.
                    console.log("updateAuthStatus: Not logged in, template_id in URL query param is:", templateIdFromUrl, ". Checking if it was already loaded.");
                    if (promptGenerationSection && promptGenerationSection.style.display === 'block' &&
                        currentGenerationTemplateData && currentGenerationTemplateData.id === templateIdFromUrl && currentGenerationTemplateData.is_public) {
                        console.log("updateAuthStatus: Public template from URL query param seems to be already loaded and displayed.");
                        publicTemplateLoadedViaUrlQuery = true; 
                    } else {
                         console.log("updateAuthStatus: Public template from URL query param not currently displayed or not matching. Default public view will be shown.");
                    }
                }

                if (!publicTemplateLoadedViaUrlQuery) {
                    console.log("updateAuthStatus: No specific public template loaded via URL query param, showing general public templates section.");
                    if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                }
                fetchAndDisplayPublicTemplates();
            }
            console.log("updateAuthStatus: Finished.");
        }


        async function loadPublicTemplateFromUrl(templateId) {
            console.log("loadPublicTemplateFromUrl called for template ID:", templateId);
            if (!_supabase) {
                console.error("Supabase client not available in loadPublicTemplateFromUrl.");
                return false;
            }
            hideAllSections(); 

            const { data: template, error: err } = await _supabase
                .from('templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (err) {
                console.error("Error fetching template by ID for public view in loadPublicTemplateFromUrl:", err);
                alert("テンプレートを読み込めませんでした。削除されたか、リンクが間違っている可能性があります。");
                window.history.replaceState({}, document.title, window.location.pathname);
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                fetchAndDisplayPublicTemplates();
                return false;
            }

            if (template) {
                console.log("loadPublicTemplateFromUrl: Template data fetched:", template);
                if (template.is_public) {
                    console.log("loadPublicTemplateFromUrl: Template is public, calling handleUseTemplate.");
                    await handleUseTemplate(template.id);
                    if (currentGenerationTemplateData) {
                        currentGenerationTemplateData.id = template.id;
                        currentGenerationTemplateData.is_public = template.is_public;
                    }
                    return true;
                } else {
                    console.warn("loadPublicTemplateFromUrl: Template is not public.");
                    alert("このテンプレートは公開されていません。所有者の場合はログインしてください。");
                    if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                    fetchAndDisplayPublicTemplates();
                    return false;
                }
            } else {
                console.warn("loadPublicTemplateFromUrl: Template not found for ID:", templateId);
                alert("テンプレートが見つかりません。");
                window.history.replaceState({}, document.title, window.location.pathname);
                if (publicTemplatesSection) publicTemplatesSection.style.display = 'block';
                fetchAndDisplayPublicTemplates();
                return false;
            }
        }


        if (loginButton) {
            loginButton.addEventListener('click', async () => {
                if (!_supabase) return;
                console.log("Login button clicked.");
                const { error } = await _supabase.auth.signInWithOAuth({ provider: 'google' });
                if (error) console.error('Error logging in:', error.message);
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                if (!_supabase) return;
                console.log("Logout button clicked.");
                const { error } = await _supabase.auth.signOut();
                if (error) console.error('Error logging out:', error.message);
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
            templatesListDiv.innerHTML = '<p>テンプレートを読み込み中...</p>';

            const { data: { session } } = await _supabase.auth.getSession();
            if (!session || !session.user) {
                templatesListDiv.innerHTML = '<p>テンプレートを表示するにはログインしてください。</p>';
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
                templatesListDiv.innerHTML = '<p>テンプレートの読み込み中にエラーが発生しました。コンソールを確認してください。</p>';
            } else {
                renderTemplates(data, userId); 
            }
        }

        function renderTemplates(templatesData, currentUserId) {
            if (!templatesListDiv) return;
            templatesListDiv.innerHTML = '';

            if (!templatesData || templatesData.length === 0) {
                templatesListDiv.innerHTML = '<p>まだテンプレートがありません。作成しましょう！</p>';
                return;
            }

            const ul = document.createElement('ul');
            ul.style.listStyleType = 'none';
            ul.style.padding = '0';
            const fragment = document.createDocumentFragment();

            templatesData.forEach(template => {
                const card = document.createElement('div');
                card.className = 'bg-white shadow-md rounded-lg p-4 mb-4 flex flex-col'; // Removed justify-between to allow natural height

                const titleEl = document.createElement('h4');
                titleEl.className = 'text-xl font-semibold text-gray-700 mb-2';
                titleEl.textContent = template.title;
                card.appendChild(titleEl);

                const descriptionEl = document.createElement('p');
                descriptionEl.className = 'text-gray-600 text-sm mb-3 flex-grow'; // flex-grow to push actions down
                descriptionEl.textContent = template.description || '説明なし。';
                card.appendChild(descriptionEl);

                // Placeholder for Tags - assuming template.tags is an array of tag names
                if (template.tags && template.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.className = 'mb-3';
                    template.tags.forEach(tagName => {
                        const tagBadge = document.createElement('span');
                        tagBadge.className = 'inline-block bg-blue-100 text-blue-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full';
                        tagBadge.textContent = tagName;
                        tagsContainer.appendChild(tagBadge);
                    });
                    card.appendChild(tagsContainer);
                }

                const promptSnippetEl = document.createElement('p');
                promptSnippetEl.className = 'text-xs text-gray-500 font-mono mb-3 truncate';
                promptSnippetEl.textContent = 'プロンプト: ' + (template.prompt_template ? template.prompt_template.substring(0, 100) + '...' : '未設定'); // Increased snippet length
                card.appendChild(promptSnippetEl);

                // Sharing status and URL
                const sharingStatusDiv = document.createElement('div');
                sharingStatusDiv.className = 'mb-3';

                const statusText = document.createElement('span');
                statusText.className = `text-sm font-semibold ${template.is_public ? 'text-green-600' : 'text-red-600'}`;
                statusText.textContent = template.is_public ? '公開中' : '非公開';
                sharingStatusDiv.appendChild(statusText);

                const shareUrlDisplay = document.createElement('div');
                shareUrlDisplay.className = 'text-xs text-gray-500 mt-1 break-all';
                if (template.is_public) {
                    shareUrlDisplay.textContent = `URL: ${window.location.origin}${window.location.pathname}?template_id=${template.id}`;
                } else {
                    shareUrlDisplay.textContent = '共有URLなし (非公開)';
                }
                sharingStatusDiv.appendChild(shareUrlDisplay);
                card.appendChild(sharingStatusDiv);


                // Share Toggle (will be styled later, just structure for now)
                const shareContainer = document.createElement('div');
                shareContainer.className = 'mt-2 mb-3 flex items-center'; // Use flex for label and toggle

                const shareLabelText = document.createElement('span');
                shareLabelText.className = 'mr-2 text-sm text-gray-700';
                shareLabelText.textContent = '共有設定:';
                shareContainer.appendChild(shareLabelText);

                const shareToggleLabel = document.createElement('label');
                shareToggleLabel.className = 'share-toggle-label'; // Keep existing class for JS targeting

                const shareCheckbox = document.createElement('input');
                shareCheckbox.type = 'checkbox';
                shareCheckbox.checked = template.is_public;
                shareCheckbox.className = 'form-checkbox h-5 w-5 text-blue-600'; // Basic Tailwind styling for checkbox

                // The visual slider part of the toggle is complex and relies on specific CSS.
                // For now, let's use a standard checkbox and style it with Tailwind.
                // The .share-slider can be hidden or removed if not used with new styling.
                // shareToggleLabel.appendChild(shareCheckbox); // Original had slider too.
                // For simplicity in this step, just the checkbox. Advanced toggle later.

                const newShareToggleContainer = document.createElement('div'); // Container for new toggle
                newShareToggleContainer.className = 'relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in';

                const newShareCheckbox = document.createElement('input');
                newShareCheckbox.type = 'checkbox';
                newShareCheckbox.checked = template.is_public;
                newShareCheckbox.name = `share-toggle-${template.id}`;
                newShareCheckbox.id = `share-toggle-${template.id}`;
                newShareCheckbox.className = 'form-checkbox hidden'; // Hide default, style custom

                const newShareToggleVisual = document.createElement('label');
                newShareToggleVisual.htmlFor = `share-toggle-${template.id}`;
                newShareToggleVisual.className = `block overflow-hidden h-6 rounded-full cursor-pointer ${template.is_public ? 'bg-blue-500' : 'bg-gray-300'}`;

                newShareToggleContainer.appendChild(newShareCheckbox);
                newShareToggleContainer.appendChild(newShareToggleVisual);

                shareContainer.appendChild(newShareToggleContainer); // Add new toggle to share container

                newShareCheckbox.addEventListener('change', async (event) => {
                    const newIsPublicState = event.target.checked;
                    // Update visual state of the custom toggle
                    newShareToggleVisual.className = `block overflow-hidden h-6 rounded-full cursor-pointer ${newIsPublicState ? 'bg-blue-500' : 'bg-gray-300'}`;

                    if (!currentUserId) {
                        alert("ユーザーIDが見つかりません。共有ステータスを変更できません。");
                        event.target.checked = !newIsPublicState; // Revert checkbox
                        newShareToggleVisual.className = `block overflow-hidden h-6 rounded-full cursor-pointer ${!newIsPublicState ? 'bg-blue-500' : 'bg-gray-300'}`; // Revert visual
                        return;
                    }

                    const { error: updateShareError } = await _supabase
                        .from('templates')
                        .update({ is_public: newIsPublicState, updated_at: new Date() })
                        .eq('id', template.id)
                        .eq('user_id', currentUserId);

                    if (updateShareError) {
                        console.error("Error updating sharing status:", updateShareError);
                        alert("共有ステータスの更新に失敗しました: " + updateShareError.message);
                        event.target.checked = !newIsPublicState; // Revert
                        newShareToggleVisual.className = `block overflow-hidden h-6 rounded-full cursor-pointer ${!newIsPublicState ? 'bg-blue-500' : 'bg-gray-300'}`; // Revert visual
                    } else {
                        template.is_public = newIsPublicState; // Update local state
                        statusText.className = `text-sm font-semibold ${newIsPublicState ? 'text-green-600' : 'text-red-600'}`;
                        statusText.textContent = newIsPublicState ? '公開中' : '非公開';
                        if (newIsPublicState) {
                            shareUrlDisplay.textContent = `URL: ${window.location.origin}${window.location.pathname}?template_id=${template.id}`;
                        } else {
                            shareUrlDisplay.textContent = '共有URLなし (非公開)';
                        }
                    }
                });
                card.appendChild(shareContainer);


                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'mt-4 pt-4 border-t border-gray-200 flex space-x-2'; // Added border-t for separation

                const useButton = document.createElement('button');
                useButton.textContent = '使用';
                useButton.className = 'btn-tailwind bg-green-500 hover:bg-green-600'; // Example Tailwind classes
                useButton.setAttribute('data-template-id', template.id);
                useButton.addEventListener('click', () => handleUseTemplate(template.id));
                actionsDiv.appendChild(useButton);

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'btn-tailwind bg-blue-500 hover:bg-blue-600';
                editButton.setAttribute('data-template-id', template.id);
                editButton.addEventListener('click', () => handleEditTemplate(template.id));
                actionsDiv.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'btn-tailwind bg-red-500 hover:bg-red-600';
                deleteButton.setAttribute('data-template-id', template.id);
                deleteButton.addEventListener('click', () => handleDeleteTemplate(template.id));
                actionsDiv.appendChild(deleteButton);

                card.appendChild(actionsDiv);
                fragment.appendChild(card); // Changed from li to card (div)
            });
            ul.appendChild(fragment);
            templatesListDiv.appendChild(ul);
        }

        function showTemplateEditorSection(templateDataToEdit = null) {
            hideAllSections();
            if (templateEditorSection) templateEditorSection.style.display = 'block';

            if (templateDataToEdit && currentEditingTemplateId) {
                if (editorHeading) editorHeading.textContent = 'テンプレートを編集';
                if (saveTemplateButton) saveTemplateButton.textContent = 'テンプレートを更新';
            } else {
                currentEditingTemplateId = null;
                if (editorHeading) editorHeading.textContent = '新しいテンプレートを作成';
                if (saveTemplateButton) saveTemplateButton.textContent = 'テンプレートを保存';
                if (templateForm) templateForm.reset();

                if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>まだフィールドが定義されていません。「フィールドを追加」をクリックしてください。</p>';
                if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>まだタグがありません。</span>';
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

            if (error) { console.error('Error fetching template for edit:', error); alert('テンプレートの詳細を取得できませんでした。 ' + error.message); return; }

            if (template) {
                currentEditingTemplateId = template.id;
                document.getElementById('template-title').value = template.title;
                document.getElementById('template-description').value = template.description || '';
                document.getElementById('template-prompt').value = template.prompt_template;

                if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>フィールドを読み込み中...</p>';
                if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>タグを読み込み中...</span>';

                const [fieldsResponse, templateTagLinksResponse] = await Promise.all([
                    _supabase
                        .from('fields')
                        .select('*')
                        .eq('template_id', templateId)
                        .order('sort_order', { ascending: true }),
                    _supabase
                        .from('template_tags')
                        .select('tag_id')
                        .eq('template_id', templateId)
                ]);

                const { data: fields, error: fieldsError } = fieldsResponse;
                if (fieldsError) {
                    console.error('Error fetching fields:', fieldsError);
                    if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>フィールドの読み込み中にエラーが発生しました。</p>';
                } else {
                    if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '';
                    if (fields && fields.length > 0) { fields.forEach(field => renderFieldEditorGroup(field)); }
                    else { if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>まだフィールドが定義されていません。「フィールドを追加」をクリックしてください。</p>'; }
                }

                const { data: templateTagLinks, error: ttError } = templateTagLinksResponse;
                if (ttError) {
                    console.error("Error fetching template_tag links:", ttError);
                    if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>タグの読み込み中にエラーが発生しました。</span>';
                } else if (templateTagLinks && templateTagLinks.length > 0) {
                    const tagIds = templateTagLinks.map(link => link.tag_id);
                    const { data: tagsData, error: tagsError } = await _supabase.from('tags').select('id, name').in('id', tagIds);
                    if (tagsError) { console.error("Error fetching tags:", tagsError); if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>タグの読み込み中にエラーが発生しました。</span>'; }
                    else if (tagsData) {
                        if (currentTagsDiv) currentTagsDiv.innerHTML = '';
                        if (tagsData.length === 0) currentTagsDiv.innerHTML = '<span>まだタグがありません。</span>';
                        else tagsData.forEach(tag => renderTag(tag.name, true));
                    }
                } else {
                    if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>まだタグがありません。</span>';
                }

                showTemplateEditorSection(template);
            }
        }

        async function handleDeleteTemplate(templateId) {
            if (!templateId) { console.error("No template ID provided for deletion."); return; }
            if (!confirm('このテンプレートを本当に削除しますか？この操作は元に戻せません。')) return;

            const { data: { session } } = await _supabase.auth.getSession();
            if (!session || !session.user) { alert('ログインする必要があります。'); return; }
            const userId = session.user.id;

            const { error } = await _supabase.from('templates').delete().eq('id', templateId).eq('user_id', userId);
            if (error) { console.error('Error deleting template:', error); alert(`テンプレートの削除中にエラーが発生しました: ${error.message}`); }
            else { console.log('Template deleted:', templateId); alert('テンプレートを削除しました。'); fetchAndDisplayUserTemplates(); }
        }

        if (templateForm) {
            templateForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const { data: { session } } = await _supabase.auth.getSession();
                if (!session || !session.user) { alert('ログインする必要があります。'); return; }
                const userId = session.user.id;

                const title = document.getElementById('template-title').value.trim();
                const description = document.getElementById('template-description').value.trim();
                const prompt_template = document.getElementById('template-prompt').value.trim();

                if (!title || !prompt_template) { alert('タイトルとプロンプトテンプレートは必須です。'); return; }

                let savedTemplateId = currentEditingTemplateId;
                let mainOpSuccess = false;

                if (currentEditingTemplateId) { 
                    const { data: tData, error: tError } = await _supabase.from('templates')
                        .update({ title, description, prompt_template, updated_at: new Date() })
                        .eq('id', currentEditingTemplateId).eq('user_id', userId).select().single();
                    if (tError) { console.error('Err updating template:', tError); alert(`テンプレートの更新エラー: ${tError.message}`); return; }
                    console.log('Template updated:', tData); savedTemplateId = tData.id; mainOpSuccess = true;
                } else { 
                    const { data: tData, error: tError } = await _supabase.from('templates')
                        .insert([{ user_id: userId, title, description, prompt_template }]).select().single();
                    if (tError) { console.error('Err saving template:', tError); alert(`テンプレートの保存エラー: ${tError.message}`); return; }
                    console.log('Template saved:', tData); savedTemplateId = tData.id; mainOpSuccess = true;
                }

                if (!mainOpSuccess || !savedTemplateId) { alert("テンプレートデータの保存に失敗しました。"); return; }

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

                if (fieldValidationError) { alert("フィールドの検証に失敗しました。修正して再度保存してください。"); currentEditingTemplateId = savedTemplateId; return; }

                const { error: delFieldsError } = await _supabase.from('fields').delete().eq('template_id', savedTemplateId);
                if (delFieldsError) { console.error("Err deleting old fields", delFieldsError); alert("古いフィールドのクリア中にエラーが発生しました。もう一度保存してみてください。"); currentEditingTemplateId = savedTemplateId; return; }
                if (fieldsToSave.length > 0) {
                    const { error: insFieldsError } = await _supabase.from('fields').insert(fieldsToSave);
                    if (insFieldsError) { console.error("Err saving fields", insFieldsError); alert("フィールドの保存中にエラーが発生しました。もう一度保存してみてください。"); currentEditingTemplateId = savedTemplateId; return; }
                }
                console.log("Fields saved for template:", savedTemplateId);

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
                if (tagProcessingError) { alert('部分的に成功: 一部のタグの処理中に問題が発生しました。確認して必要に応じて再度保存してください。'); }

                const { error: delOldLinksErr } = await _supabase.from('template_tags').delete().eq('template_id', savedTemplateId);
                if (delOldLinksErr) { console.error('Err del old t_tags:', delOldLinksErr); alert('古いタグのクリア中にエラーが発生しました。もう一度保存してください。'); currentEditingTemplateId = savedTemplateId; return; }
                if (validTagIds.length > 0) {
                    const linksToSave = validTagIds.map(tagId => ({ template_id: savedTemplateId, tag_id: tagId }));
                    const { error: insNewLinksErr } = await _supabase.from('template_tags').insert(linksToSave);
                    if (insNewLinksErr) { console.error('Err ins t_tags:', insNewLinksErr); alert('タグの保存中にエラーが発生しました。もう一度保存してください。'); currentEditingTemplateId = savedTemplateId; return; }
                }
                console.log("Tags saved for template:", savedTemplateId);

                alert('テンプレート、フィールド、タグが正常に処理されました！');
                currentEditingTemplateId = null; templateForm.reset();
                if (fieldsEditorDiv) fieldsEditorDiv.innerHTML = '<p>まだフィールドが定義されていません。</p>';
                if (currentTagsDiv) currentTagsDiv.innerHTML = '<span>まだタグがありません。</span>';
                if (tagInputElement) tagInputElement.value = '';
                showMyTemplatesSection();
            });
        }

        // --- Field Editor UI Functions ---
        function renderFieldEditorGroup(fieldData = null) {
            if (!fieldsEditorDiv) return null;
            if (fieldsEditorDiv.children.length === 1 && fieldsEditorDiv.querySelector('p')) {
                fieldsEditorDiv.innerHTML = '';
            }

            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'field-group bg-gray-50 p-4 border border-gray-200 rounded-md mb-4 space-y-3'; // Added space-y-3 for spacing within group

            const idInput = document.createElement('input');
            idInput.type = 'hidden';
            idInput.className = 'field-id';
            idInput.value = fieldData ? fieldData.id : '';
            fieldGroup.appendChild(idInput);

            // Sort Order
            const sortOrderDiv = document.createElement('div');
            const sortOrderLabel = document.createElement('label');
            sortOrderLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
            sortOrderLabel.textContent = '並び順: ';
            const sortOrderInput = document.createElement('input');
            sortOrderInput.type = 'number';
            sortOrderInput.className = 'field-sort-order mt-1 block w-20 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
            sortOrderInput.value = fieldData ? fieldData.sort_order : '0';
            sortOrderLabel.appendChild(sortOrderInput);
            sortOrderDiv.appendChild(sortOrderLabel);
            fieldGroup.appendChild(sortOrderDiv);

            // Name Input
            const nameDiv = document.createElement('div');
            const nameLabelEl = document.createElement('label');
            nameLabelEl.className = 'block text-sm font-medium text-gray-700 mb-1';
            nameLabelEl.textContent = '名前（{{variable}}用）: ';
            const nameInputEl = document.createElement('input');
            nameInputEl.type = 'text';
            nameInputEl.className = 'field-name mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
            nameInputEl.required = true;
            nameInputEl.value = fieldData ? fieldData.name : '';
            nameLabelEl.appendChild(nameInputEl);
            nameDiv.appendChild(nameLabelEl);
            fieldGroup.appendChild(nameDiv);

            // Label Input
            const labelDivElement = document.createElement('div'); // Renamed to avoid conflict with label variable in parent scope
            const labelLabelEl = document.createElement('label');
            labelLabelEl.className = 'block text-sm font-medium text-gray-700 mb-1';
            labelLabelEl.textContent = 'ラベル（UI表示）: ';
            const labelInputEl = document.createElement('input');
            labelInputEl.type = 'text';
            labelInputEl.className = 'field-label mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
            labelInputEl.required = true;
            labelInputEl.value = fieldData ? fieldData.label : '';
            labelLabelEl.appendChild(labelInputEl);
            labelDivElement.appendChild(labelLabelEl);
            fieldGroup.appendChild(labelDivElement);

            // Type Select
            const typeDiv = document.createElement('div');
            const typeLabel = document.createElement('label');
            typeLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
            typeLabel.textContent = 'タイプ: ';
            const typeSelect = document.createElement('select');
            typeSelect.className = 'field-type mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
            ['text', 'select', 'checkbox'].forEach(typeValue => {
                const option = document.createElement('option');
                option.value = typeValue;
                option.textContent = typeValue.charAt(0).toUpperCase() + typeValue.slice(1);
                if (fieldData && fieldData.type === typeValue) option.selected = true;
                typeSelect.appendChild(option);
            });
            typeLabel.appendChild(typeSelect);
            typeDiv.appendChild(typeLabel);
            fieldGroup.appendChild(typeDiv);

            // Options Input (for select type)
            const optionsWrapper = document.createElement('div');
            optionsWrapper.className = 'field-options-wrapper space-y-1';
            const optionsLabel = document.createElement('label');
            optionsLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
            optionsLabel.textContent = 'オプション（カンマ区切り）: ';
            const optionsInputEl = document.createElement('input');
            optionsInputEl.type = 'text';
            optionsInputEl.className = 'field-options mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
            if (fieldData && fieldData.type === 'select' && fieldData.options) {
                optionsInputEl.value = Array.isArray(fieldData.options) ? fieldData.options.join(',') : (fieldData.options || '');
            }
            optionsLabel.appendChild(optionsInputEl);
            optionsWrapper.appendChild(optionsLabel);
            fieldGroup.appendChild(optionsWrapper);

            typeSelect.addEventListener('change', () => { optionsWrapper.style.display = typeSelect.value === 'select' ? 'block' : 'none'; });
            if (fieldData && fieldData.type === 'select') optionsWrapper.style.display = 'block'; else optionsWrapper.style.display = 'none';

            // Remove Button
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.textContent = 'フィールドを削除';
            removeButton.className = 'btn-tailwind bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 mt-2'; // Smaller button
            removeButton.addEventListener('click', () => { fieldGroup.remove(); if (fieldsEditorDiv.children.length === 0) fieldsEditorDiv.innerHTML = '<p class="text-gray-500 text-sm">まだフィールドが定義されていません。</p>'; });
            fieldGroup.appendChild(removeButton);

            fieldsEditorDiv.appendChild(fieldGroup);
            return fieldGroup;
        }

        if (addFieldButton) { addFieldButton.addEventListener('click', () => renderFieldEditorGroup()); }

        function renderTag(tagName, isExisting = false) {
            if (!currentTagsDiv) return;
            const noTagsMsg = currentTagsDiv.querySelector('span'); if (noTagsMsg && noTagsMsg.textContent.includes('まだタグがありません。')) currentTagsDiv.innerHTML = '';
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
            removeBtn.addEventListener('click', () => { display.remove(); if (currentTagsDiv.children.length === 0) currentTagsDiv.innerHTML = '<span>まだタグがありません。</span>'; });
            display.appendChild(removeBtn); currentTagsDiv.appendChild(display);
        }

        if (addTagButton) { addTagButton.addEventListener('click', () => { if (tagInputElement) { const name = tagInputElement.value.trim(); if (name) { renderTag(name); tagInputElement.value = ''; } } }); }
        if (tagInputElement) { tagInputElement.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTagButton.click(); } }); }

        function showPromptGenerationSection() {
            hideAllSections();
            if (promptGenerationSection) promptGenerationSection.style.display = 'block';
        }

        function renderGenerationField(field) {
            const container = document.createElement('div');
            container.className = 'mb-4'; // Tailwind margin bottom

            const label = document.createElement('label');
            label.className = 'block text-sm font-medium text-gray-700 mb-1';
            label.textContent = field.label + ': ';

            let input;
            const inputBaseClasses = 'mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';

            if (field.type === 'text') {
                input = document.createElement('input');
                input.type = 'text';
                input.className = inputBaseClasses;
            } else if (field.type === 'select') {
                input = document.createElement('select');
                input.className = inputBaseClasses;
                if (field.options && Array.isArray(field.options)) {
                    field.options.forEach(optText => {
                        const option = document.createElement('option');
                        option.value = optText;
                        option.textContent = optText;
                        input.appendChild(option);
                    });
                }
            } else if (field.type === 'checkbox') {
                // For checkbox, wrap label and input for better layout
                container.classList.add('flex', 'items-center');
                input = document.createElement('input');
                input.type = 'checkbox';
                input.value = field.label; // Or field.name if more appropriate
                input.className = 'form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded mr-2 focus:ring-indigo-500';
                // Adjust label to be after checkbox
                label.className = 'text-sm text-gray-700';
                label.textContent = field.label; // Just the label text for checkbox
            } else { // Default to text
                input = document.createElement('input');
                input.type = 'text';
                input.className = inputBaseClasses;
            }

            input.id = `gen-field-${field.name}`;
            label.htmlFor = input.id;

            if (field.type === 'checkbox') {
                container.appendChild(input); // Checkbox first
                container.appendChild(label); // Then label
            } else {
                container.appendChild(label); // Label first
                container.appendChild(input); // Then input/select
            }

            input.classList.add('generation-input-field'); // Keep existing class if used by other JS
            input.setAttribute('data-field-name', field.name);
            input.addEventListener('input', regenerateDynamicPrompt);
            input.addEventListener('change', regenerateDynamicPrompt);

            return container;
        }

        async function handleUseTemplate(templateId) {
            console.log("Using template ID:", templateId);
            const { data: t, error: tE } = await _supabase.from('templates').select('*').eq('id', templateId).single();
            if (tE) { console.error("Err fetch template for gen:", tE); alert("テンプレートを読み込めませんでした: " + tE.message); return; }
            const { data: f, error: fE } = await _supabase.from('fields').select('*').eq('template_id', templateId).order('sort_order');
            if (fE) { console.error("Err fetch fields for gen:", fE); alert("フィールドを読み込めませんでした: " + fE.message); return; }
            
            currentGenerationTemplateData = { 
                prompt_template: t.prompt_template, 
                fields: f || [], 
                template_title: t.title, 
                template_description: t.description,
                id: t.id, 
                is_public: t.is_public
            };

            if (generationTemplateInfoDiv) {
                generationTemplateInfoDiv.innerHTML = `
                    <h3 class="text-xl font-semibold text-gray-800">${t.title}</h3>
                    <p class="text-sm text-gray-600 mt-1">${t.description || '説明なし。'}</p>
                `;
            }
            if (generationFieldsFormDiv) {
                generationFieldsFormDiv.innerHTML = '';
                if (f && f.length > 0) {
                    f.forEach(field => generationFieldsFormDiv.appendChild(renderGenerationField(field)));
                } else {
                    generationFieldsFormDiv.innerHTML = '<p class="text-gray-500 text-sm">このテンプレートには入力フィールドがありません。</p>';
                }
            }
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
                if (!generatedPromptOutputTextarea) return; const text = generatedPromptOutputTextarea.value; if (!text) { alert("コピーするものがありません"); return; }
                if (navigator.clipboard && navigator.clipboard.writeText) { try { await navigator.clipboard.writeText(text); copyPromptButton.textContent = 'コピーしました！'; setTimeout(() => copyPromptButton.textContent = 'プロンプトをコピー', 2000); } catch (err) { console.error("Fail copy", err); alert("コピーに失敗しました"); } }
                else { try { generatedPromptOutputTextarea.select(); document.execCommand('copy'); generatedPromptOutputTextarea.blur(); copyPromptButton.textContent = 'コピーしました！'; setTimeout(() => copyPromptButton.textContent = 'プロンプトをコピー', 2000); } catch (err) { alert("コピーに失敗しました（フォールバック）"); } }
            });
        }
        if (backToMyTemplatesButton) { 
            backToMyTemplatesButton.addEventListener('click', async () => {
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

        function renderPublicTemplates(templatesData) {
            if (!publicTemplatesListDiv) return; publicTemplatesListDiv.innerHTML = '';
            if (!templatesData || templatesData.length === 0) { publicTemplatesListDiv.innerHTML = '<p>現在、公開テンプレートはありません。</p>'; return; }
            const ul = document.createElement('ul'); ul.style.listStyleType = 'none'; ul.style.padding = '0';
            const fragment = document.createDocumentFragment();

            templatesData.forEach(t => {
                const card = document.createElement('div');
                card.className = 'bg-white shadow-md rounded-lg p-4 mb-4 flex flex-col';

                const titleEl = document.createElement('h4');
                titleEl.className = 'text-xl font-semibold text-gray-700 mb-2';
                titleEl.textContent = t.title;
                card.appendChild(titleEl);

                const descriptionEl = document.createElement('p');
                descriptionEl.className = 'text-gray-600 text-sm mb-3 flex-grow';
                descriptionEl.textContent = t.description || '説明なし。';
                card.appendChild(descriptionEl);

                // Placeholder for Tags - if public templates might have tags shown
                // For now, this part is omitted for public templates for simplicity,
                // but can be added if template objects for public view include tags.
                // if (t.tags && t.tags.length > 0) { ... }


                // Action Button
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'mt-4 pt-4 border-t border-gray-200 flex';

                const useButton = document.createElement('button');
                useButton.textContent = '表示して使用';
                // Apply the temporary Tailwind-like button style
                useButton.className = 'btn-tailwind bg-blue-500 hover:bg-blue-600 w-full'; // Full width for single button
                useButton.setAttribute('data-template-id', t.id);
                useButton.addEventListener('click', () => handleUseTemplate(t.id));
                actionsDiv.appendChild(useButton);

                card.appendChild(actionsDiv);
                fragment.appendChild(card);
            });
            ul.appendChild(fragment);
            publicTemplatesListDiv.appendChild(ul);
        }

        async function fetchAndDisplayPublicTemplates() {
            if (!publicTemplatesListDiv || !_supabase) return; 
            if (!publicTemplatesListDiv.innerHTML || publicTemplatesListDiv.innerHTML.includes('<p>公開テンプレートを読み込み中...</p>')) {
                 publicTemplatesListDiv.innerHTML = '<p>公開テンプレートを読み込み中...</p>';
            }

            const { data, error } = await _supabase.from('templates').select('id,title,description,user_id,is_public').eq('is_public', true).order('created_at', { ascending: false });
            if (error) { 
                console.error("Error fetching public templates:", error); 
                if (publicTemplatesListDiv.innerHTML.includes('<p>公開テンプレートを読み込み中...</p>')) {
                     publicTemplatesListDiv.innerHTML = '<p>公開テンプレートの読み込み中にエラーが発生しました。後でもう一度お試しください。</p>';
                }
            }
            else { renderPublicTemplates(data); }
        }

        _supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                console.log("Auth event:", event, "Session:", session ? (session.user ? session.user.email : 'session but no user') : 'no session');
                await updateAuthStatus(session);
            } catch (e) {
                console.error("Error inside onAuthStateChange callback:", e);
            }
        });

        (async () => {
            try {
                console.log("Initial IIFE execution started.");
                if (!_supabase) {
                    console.error("IIFE: Supabase client not initialized. Cannot proceed.");
                    const mainContent = document.querySelector('main');
                    if (mainContent) mainContent.innerHTML = '<p style="color:red;">エラー: アプリケーションの重要なサービスがIIFEで読み込めませんでした。ページを更新してください。</p>';
                    return;
                }

                const params = new URLSearchParams(window.location.search);
                const templateIdFromUrl = params.get('template_id');

                if (templateIdFromUrl) {
                    console.log("IIFE: template_id found in query params:", templateIdFromUrl);
                    const { data: { session: currentSession }, error: sessionError } = await _supabase.auth.getSession();
                    if(sessionError) console.error("IIFE: Error getting session for URL query param check:", sessionError);
                     
                    if (!(currentSession && currentSession.user)) {
                        console.log("IIFE: No active session. Attempting to load public template from URL query param if available.");
                        await loadPublicTemplateFromUrl(templateIdFromUrl); 
                    } else {
                        console.log("IIFE: Active session exists. onAuthStateChange will handle template loading for user:", currentSession.user.email);
                    }
                } else {
                    console.log("IIFE: No template_id in query params. Page will display based on auth state determined by onAuthStateChange.");
                }
                
                console.log("IIFE: Initial setup for query params complete. onAuthStateChange is responsible for initial UI render based on auth state.");

            } catch (e) {
                console.error("Error in initial IIFE execution:", e);
            }
            console.log("Initial IIFE execution finished.");
        })();

        if (createNewTemplateButton) {
            createNewTemplateButton.addEventListener('click', () => {
                currentEditingTemplateId = null; 
                showTemplateEditorSection(); 
            });
        }
        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', async () => {
                currentEditingTemplateId = null; 
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

        // Tooltip logic
        if (tooltipTrigger && syntaxGuideTooltip) {
            tooltipTrigger.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click from immediately being caught by document listener
                syntaxGuideTooltip.classList.toggle('hidden');
            });

            document.addEventListener('click', (event) => {
                if (!syntaxGuideTooltip.classList.contains('hidden') &&
                    !syntaxGuideTooltip.contains(event.target) &&
                    event.target !== tooltipTrigger) {
                    syntaxGuideTooltip.classList.add('hidden');
                }
            });
        }

    } // End of else block for Supabase client initialized successfully
}
