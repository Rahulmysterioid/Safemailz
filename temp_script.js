
        // ---- State ----
        let currentQuantity = 5;
        let billingCycle = 'monthly';
        const PRICE_PER_USER_MONTH = 100;
        const PRICE_PER_USER_YEAR = 1000;
        const EMAIL_FILTER_LABELS = {
            all: 'All Emails',
            read: 'Read',
            unread: 'Unread',
            draft: 'Draft',
            action: 'Action',
            reply: 'Reply',
            'folder:inbox': 'Inbox',
            'folder:sent': 'Sent',
            'folder:drafts': 'Drafts',
            'folder:deleted': 'Deleted Items',
            'folder:junk': 'Junk Email',
            'folder:archive': 'Archive',
            'folder:received': 'Received'
        };
        const SEEDED_EMAILS = [
            { id: 'm-1001', sender: 'Jessica Williams', subject: 'Meeting Notes - Product', preview: 'Attached are the notes from today product roadmap meeting.', folder: 'inbox', read: false, replied: false, action: true, emailNo: '43235', date: '2:53 PM' },
            { id: 'm-1002', sender: 'David Lee', subject: 'Customer Feedback - Q3 Review', preview: 'Summary of customer feedback received during Q3 and action items.', folder: 'inbox', read: true, replied: true, action: false, emailNo: '56234', date: '1:48 PM' },
            { id: 'm-1003', sender: 'Jonas Vsalon', subject: 'Customer Feedback - Q3 Review', preview: 'Summary of customer feedback received during Q3 and action items.', folder: 'received', read: false, replied: false, action: true, emailNo: '63445', date: '1:35 PM' },
            { id: 'm-1004', sender: 'Thomas John', subject: 'Compliance document update', preview: 'Please review the updated compliance attachment before approval.', folder: 'received', read: true, replied: false, action: true, emailNo: '64376', date: '12:48 PM' },
            { id: 'm-1005', sender: 'David Lee', subject: 'Re: Vendor contract summary', preview: 'I replied with the corrected contract terms and approval notes.', folder: 'sent', read: true, replied: true, action: false, emailNo: '23456', date: '11:45 AM' },
            { id: 'm-1006', sender: 'Jonas Vsalon', subject: 'Customer Feedback - Q3 Review', preview: 'Follow up sent to customer success and product owners.', folder: 'sent', read: true, replied: true, action: false, emailNo: '34564', date: '1:35 PM' },
            { id: 'm-1007', sender: 'System Draft', subject: 'Draft: Security policy announcement', preview: 'This draft needs a final review before sending to all employees.', folder: 'drafts', read: true, replied: false, action: true, emailNo: '77821', date: 'Yesterday' },
            { id: 'm-1008', sender: 'Safemailz Admin', subject: 'Draft: Password rotation reminder', preview: 'Reminder draft prepared for monthly password rotation.', folder: 'drafts', read: true, replied: false, action: false, emailNo: '77822', date: 'Yesterday' },
            { id: 'm-1009', sender: 'Noman Azam', subject: 'Archived: March storage report', preview: 'Monthly storage report archived after admin review.', folder: 'archive', read: true, replied: false, action: false, emailNo: '88910', date: 'Jun 11' },
            { id: 'm-1010', sender: 'Spam Filter', subject: 'Suspicious login prize notice', preview: 'This message was marked as junk by the Safemailz filter.', folder: 'junk', read: false, replied: false, action: false, emailNo: '99001', date: 'Jun 10' },
            { id: 'm-1011', sender: 'Trash', subject: 'Deleted: Old invoice copy', preview: 'Deleted item retained temporarily for recovery.', folder: 'deleted', read: true, replied: false, action: false, emailNo: '77110', date: 'Jun 09' },
            { id: 'm-1012', sender: 'Ayesha Khan', subject: 'Action required: client backup failed', preview: 'Client backup failed overnight and requires admin attention.', folder: 'inbox', read: false, replied: false, action: true, emailNo: '56291', date: 'Jun 08' }
        ];
        let activeEmailFilter = 'all';
        let activeMailSection = 'dashboard';
        let emailSearchQuery = '';
        let isDashboardCollapsed = false;
        const EMAIL_DASHBOARD_COLLAPSE_THRESHOLD = 24;
        const DEFAULT_EMAIL_PERMISSIONS = {
            sendEmails: true,
            replyEmails: true,
            viewRealEmailIds: false,
            sendSpecificEmails: true,
            projectBasedEmails: false,
            blocked: false,
            allowedEmails: ['David Lee@gmail.com', 'Davin company@gmail.com', 'join hulk@gmail.com']
        };
        const DEFAULT_PROJECT_ASSIGNMENTS = [
            { id: 'project-1', projectName: 'Serpix lab LLC', client: 'jessica williams', leader: 'Yash', employeeName: 'Nouman and muzamil', projectEmailId: '' },
            { id: 'project-2', projectName: 'Ravyrv Lab LLC', client: 'David lee', leader: 'Yash', employeeName: 'Nouman, yash thakor', projectEmailId: '' },
            { id: 'project-3', projectName: 'Google lc', client: 'jonas vslon', leader: 'Yash', employeeName: 'Sayem uddin', projectEmailId: '' }
        ];
        const DEFAULT_EMAIL_ID_RECORDS = [
            { id: 'eid-1', realEmail: 'jessicawilliams@samplelab.com', cloneEmail: 'Jessica - Client - 34427', leader: 'Muzamil and nouman', projectName: 'Senpix lab LLC', emailNo: '10434', signature: 'Yash Thakor, Account Executive (P) 079-123-1071 (M) 079 ysh@workfore247.com', status: 'Active' },
            { id: 'eid-2', realEmail: 'Davidlee@beverlyhills.com', cloneEmail: 'David- Client - 34389', leader: 'Sayem uddin', projectName: 'Beverly Hills LLC', emailNo: '34104', signature: 'Photo', status: 'Pending' },
            { id: 'eid-3', realEmail: 'Muzamil@safemailz.com', cloneEmail: '-NA-', leader: 'Yash thakor', projectName: 'Facebook LLC', emailNo: '61044', signature: 'Yash Thakor, Account Executive (P) 079-123-1071 (M) 079 ysh@workfore247.com', status: 'Active' },
            { id: 'eid-4', realEmail: 'jonasvslon@google.com', cloneEmail: 'Jonas- Client - 34086', leader: 'Muzamil and yash thakor', projectName: 'Google LLC', emailNo: '47876', signature: 'Photo', status: 'Active' },
            { id: 'eid-5', realEmail: 'thomasjohn@amazon.com', cloneEmail: 'thomas- Client - 34896', leader: 'Nouman', projectName: 'Amazon LLC', emailNo: '83974', signature: 'Yash Thakor, Account Executive (P) 079-123-1071 (M) 079 ysh@workfore247.com', status: 'Pending' }
        ];
        const DEFAULT_BACKUP_STATE = {
            employeeName: 'Muzamil Khan',
            email: 'Muzamila khan@safemailz.com',
            projectsCount: 12,
            storageUsedGb: 15,
            storageTotalGb: 20,
            storagePercentUsed: 80,
            messageStorageGb: 8.2,
            attachmentStorageGb: 4.8,
            archiveStorageGb: 2,
            accordionOpen: false,
            backupsStarted: 0
        };
        let editingAllowedEmailIndex = null;
        let projectSearchQuery = '';
        let emailIdsSearchQuery = '';

        function getHeaders() {
            const userStr = localStorage.getItem('currentUser');
            let headers = { 'Content-Type': 'application/json' };
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    headers['X-User-Id'] = user.id;
                    headers['X-Org-Id'] = user.organization_id;
                } catch(e) {}
            }
            return headers;
        }

        async function getEmailRecords() {
            try {
                const response = await fetch('/api/emails?filter=' + encodeURIComponent(activeEmailFilter) + '&search=' + encodeURIComponent(emailSearchQuery), {
                    headers: getHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.emails || [];
                }
            } catch (error) {
                console.error("Failed to fetch emails:", error);
            }
            return [];
        }

        function getEmployeeStoreKey(suffix) {
            const employeeId = currentProfileIndex !== null ? currentProfileIndex : 'global';
            return `safemailz:${suffix}:${employeeId}`;
        }

        function cloneDefault(value) {
            return JSON.parse(JSON.stringify(value));
        }

        function getEmailPermissions() {
            const stored = localStorage.getItem(getEmployeeStoreKey('emailPermissions'));
            if (stored) return JSON.parse(stored);
            const permissions = cloneDefault(DEFAULT_EMAIL_PERMISSIONS);
            localStorage.setItem(getEmployeeStoreKey('emailPermissions'), JSON.stringify(permissions));
            return permissions;
        }

        function saveEmailPermissions(permissions) {
            localStorage.setItem(getEmployeeStoreKey('emailPermissions'), JSON.stringify(permissions));
        }

        function getProjectAssignments() {
            const stored = localStorage.getItem(getEmployeeStoreKey('projectAssignments'));
            if (stored) return JSON.parse(stored);
            const projects = cloneDefault(DEFAULT_PROJECT_ASSIGNMENTS);
            localStorage.setItem(getEmployeeStoreKey('projectAssignments'), JSON.stringify(projects));
            return projects;
        }

        function saveProjectAssignments(projects) {
            localStorage.setItem(getEmployeeStoreKey('projectAssignments'), JSON.stringify(projects));
        }

        function getEmailIdRecords() {
            const stored = localStorage.getItem(getEmployeeStoreKey('emailIdRecords'));
            if (stored) return JSON.parse(stored);
            const records = cloneDefault(DEFAULT_EMAIL_ID_RECORDS);
            localStorage.setItem(getEmployeeStoreKey('emailIdRecords'), JSON.stringify(records));
            return records;
        }

        function getBackupState() {
            const stored = localStorage.getItem(getEmployeeStoreKey('backupState'));
            if (stored) return { ...cloneDefault(DEFAULT_BACKUP_STATE), ...JSON.parse(stored) };
            const state = cloneDefault(DEFAULT_BACKUP_STATE);
            localStorage.setItem(getEmployeeStoreKey('backupState'), JSON.stringify(state));
            return state;
        }

        function saveBackupState(state) {
            localStorage.setItem(getEmployeeStoreKey('backupState'), JSON.stringify(state));
        }

        function filterEmailRecords(records, filter, query = '') {
            const normalizedQuery = query.trim().toLowerCase();
            const filtered = records.filter(mail => {
                let matchesFilter = true;
                if (filter === 'read') matchesFilter = mail.read;
                if (filter === 'unread') matchesFilter = !mail.read;
                if (filter === 'draft') matchesFilter = mail.folder === 'drafts';
                if (filter === 'action') matchesFilter = mail.action;
                if (filter === 'reply') matchesFilter = mail.replied;
                if (filter.startsWith('folder:')) matchesFilter = mail.folder === filter.split(':')[1];

                if (!normalizedQuery) return matchesFilter;
                const haystack = `${mail.sender} ${mail.subject} ${mail.preview} ${mail.emailNo} ${mail.folder}`.toLowerCase();
                return matchesFilter && haystack.includes(normalizedQuery);
            });

            return filtered;
        }

        function getEmailCounts(records) {
            return {
                all: records.length,
                read: records.filter(mail => mail.read).length,
                unread: records.filter(mail => !mail.read).length,
                draft: records.filter(mail => mail.folder === 'drafts').length,
                action: records.filter(mail => mail.action).length,
                reply: records.filter(mail => mail.replied).length
            };
        }

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function setMailProgress(card, count, total) {
            const progress = card.querySelector('.mail-progress');
            const percent = total ? Math.round((count / total) * 100) : 0;
            progress.style.setProperty('--percent', percent);
            progress.querySelector('span').textContent = `${percent}%`;
        }

        function renderEmailSummary(records) {
            const counts = getEmailCounts(records);
            const total = counts.all || 1;
            document.getElementById('mailCountAll').textContent = counts.all;
            document.getElementById('mailCountRead').textContent = counts.read;
            document.getElementById('mailCountUnread').textContent = counts.unread;
            document.getElementById('mailCountDraft').textContent = counts.draft;
            document.getElementById('mailCountAction').textContent = counts.action;
            document.getElementById('mailCountReply').textContent = counts.reply;
            document.querySelectorAll('.mail-summary-card').forEach(card => {
                const filter = card.dataset.emailFilter;
                setMailProgress(card, counts[filter] || 0, total);
            });
        }

        function renderEmailList(records) {
            const body = document.getElementById('emailListBody');
            const empty = document.getElementById('mailEmptyState');
            
            const filterLabel = document.getElementById('activeEmailFilterLabel');
            if (filterLabel) filterLabel.textContent = EMAIL_FILTER_LABELS[activeEmailFilter] || 'Emails';
            
            const countLabel = document.getElementById('activeEmailCount');
            if (countLabel) countLabel.textContent = `${records.length} email${records.length === 1 ? '' : 's'}`;
            
            if (body) body.innerHTML = '';

            records.forEach(mail => {
                const row = document.createElement('div');
                row.className = `mail-row ${mail.read ? 'read' : 'unread'}`;
                row.style.padding = '0.7rem 1rem';
                row.style.borderBottom = '1px solid #DDE2E6';
                row.style.cursor = 'pointer';
                row.onclick = () => openEmailDetails(mail.id);

                const initials = mail.sender ? mail.sender.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : 'U';
                row.innerHTML = `
                    <div class="mail-from-cell">
                        <span class="mail-avatar">${escapeHtml(initials)}</span>
                        <div>
                            <div class="mail-sender">${escapeHtml(mail.sender || 'Unknown')}</div>
                            <div class="mail-subject">${escapeHtml(mail.subject || 'No Subject')}</div>
                            <div class="mail-preview" style="color: #666; font-size: 0.72rem;">${escapeHtml(mail.preview || '')}</div>
                        </div>
                        <div style="margin-left: auto; font-size: 0.72rem; color: #888;">${escapeHtml(mail.date)}</div>
                    </div>
                `;
                body.appendChild(row);
            });

            if (empty) empty.style.display = records.length ? 'none' : 'block';
        }

        let currentOpenEmailId = null;

        async function openEmailDetails(id) {
            try {
                const response = await fetch('/api/emails/' + id, { headers: getHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    const mail = data.email;
                    currentOpenEmailId = mail.id;

                    document.getElementById('readingEmailNo').textContent = "Email No: " + mail.emailNo;
                    document.getElementById('readingSubject').textContent = mail.subject;
                    document.getElementById('readingSenderName').textContent = mail.sender;
                    document.getElementById('readingSenderEmail').textContent = mail.senderEmail;
                    document.getElementById('readingTo').textContent = "To: Me";
                    document.getElementById('readingDate').textContent = mail.date;
                    document.getElementById('readingBody').textContent = mail.body;
                    
                    const initials = mail.sender ? mail.sender.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : 'U';
                    document.getElementById('readingAvatar').textContent = initials;

                    document.getElementById('mailReadingColumn').style.display = 'flex';
                    
                    // Also refresh the list to mark as read
                    renderEmailModule();
                }
            } catch (e) {
                console.error(e);
            }
        }

        // Comments functionality
        async function toggleComments() {
            const sidebar = document.getElementById('commentsSidebar');
            if (sidebar.style.display === 'none') {
                sidebar.style.display = 'flex';
                if (currentOpenEmailId) {
                    await loadComments(currentOpenEmailId);
                }
            } else {
                sidebar.style.display = 'none';
            }
        }

        async function loadComments(emailId) {
            try {
                const response = await fetch('/api/emails/' + emailId + '/comments', { headers: getHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    const list = document.getElementById('commentsList');
                    list.innerHTML = '';
                    data.comments.forEach(c => {
                        const initials = c.user_name ? c.user_name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : 'U';
                        list.innerHTML += `
                            <div class="comment-item">
                                <div class="comment-avatar">${escapeHtml(initials)}</div>
                                <div>
                                    <span class="comment-author">${escapeHtml(c.user_name)}</span>
                                    <span class="comment-time">${escapeHtml(c.date)}</span>
                                    <div class="comment-content">${escapeHtml(c.comment)}</div>
                                </div>
                            </div>
                        `;
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }

        async function handleCommentKeyPress(e) {
            if (e.key === 'Enter' && currentOpenEmailId) {
                const input = document.getElementById('newCommentInput');
                const comment = input.value.trim();
                if (!comment) return;

                try {
                    const response = await fetch('/api/emails/' + currentOpenEmailId + '/comments', {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({ comment })
                    });
                    if (response.ok) {
                        input.value = '';
                        loadComments(currentOpenEmailId);
                    }
                } catch(err) {
                    console.error(err);
                }
            }
        }

        // Compose Email
        function openComposeModal() {
            document.getElementById('composeTo').value = '';
            document.getElementById('composeSubject').value = '';
            document.getElementById('composeBody').value = '';
            document.getElementById('composeError').style.display = 'none';
            document.getElementById('composeEmailModal').classList.add('active');
        }

        async function sendEmail() {
            const to = document.getElementById('composeTo').value.trim();
            const subject = document.getElementById('composeSubject').value.trim();
            const body = document.getElementById('composeBody').value.trim();
            const errorDiv = document.getElementById('composeError');
            errorDiv.style.display = 'none';

            if (!to || !subject || !body) {
                errorDiv.textContent = "Please fill all fields";
                errorDiv.style.display = 'block';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(to)) {
                errorDiv.textContent = "Please enter a valid email address format.";
                errorDiv.style.display = 'block';
                return;
            }

            const btn = document.querySelector('#composeEmailModal .btn-modal-proceed');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/emails/send', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ to, subject, body })
                });
                if (response.ok) {
                    closeModal('composeEmailModal');
                    // Automatically switch to Sent folder to show the new email
                    setMailSection('dashboard', 'folder:sent');
                    applyEmailFilter('folder:sent');
                } else {
                    const data = await response.json();
                    errorDiv.textContent = data.error || "Failed to send email. Ensure the recipient exists in Safemailz.";
                    errorDiv.style.display = 'block';
                }
            } catch (e) {
                console.error(e);
                errorDiv.textContent = "Network error. Failed to send.";
                errorDiv.style.display = 'block';
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        function openReply() {
            const senderEmail = document.getElementById('readingSenderEmail').textContent;
            openComposeModal();
            document.getElementById('composeTo').value = senderEmail;
            document.getElementById('composeSubject').value = "Re: " + document.getElementById('readingSubject').textContent;
        }

        function openForward() {
            openComposeModal();
            document.getElementById('composeSubject').value = "Fwd: " + document.getElementById('readingSubject').textContent;
            document.getElementById('composeBody').value = "\\n\\n--- Forwarded Message ---\\nFrom: " + document.getElementById('readingSenderEmail').textContent + "\\n" + document.getElementById('readingBody').textContent;
        }

        function syncEmailActiveStates() {
            document.querySelectorAll('.mail-summary-card').forEach(card => {
                card.classList.toggle('active', card.dataset.emailFilter === activeEmailFilter);
            });
            document.querySelectorAll('.email-folder').forEach(folder => {
                folder.classList.toggle('active', folder.dataset.emailFilter === activeEmailFilter);
            });
            document.querySelectorAll('.mail-subtab[data-mail-section]').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.mailSection === activeMailSection);
            });
            syncMailTabStates();
        }

        function setMailSection(section, nextFilter) {
            activeMailSection = section;
            const isMailListSection = section === 'dashboard' || section === 'emails';
            const setDisplay = (id, val) => { const el = document.getElementById(id); if (el) el.style.display = val; };
            setDisplay('mailDashboardPanel', section === 'dashboard' ? 'block' : 'none');
            setDisplay('mailListPanel', isMailListSection ? 'flex' : 'none');
            setDisplay('emailFolderBar', section === 'emails' ? 'flex' : 'none');
            setDisplay('mailManagePanel', section === 'manage' ? 'block' : 'none');
            setDisplay('mailProjectsPanel', section === 'projects' ? 'block' : 'none');
            setDisplay('mailEmailIdsPanel', section === 'emailIds' ? 'block' : 'none');
            setDisplay('mailBackupPanel', section === 'backup' ? 'block' : 'none');
            if (nextFilter) activeEmailFilter = nextFilter;
            if (section === 'emails' && !activeEmailFilter.startsWith('folder:') && activeEmailFilter !== 'all') {
                activeEmailFilter = 'folder:inbox';
            }
            if (section === 'dashboard') {
                resetEmailDashboardScrollState();
            } else {
                setEmailDashboardCollapsed(false);
            }
            renderEmailModule();
        }

        function switchMailTab(clickedTab, filter) {
            // Immediately toggle active class for instant visual feedback
            document.querySelectorAll('.mail-tab').forEach(t => t.classList.remove('active'));
            clickedTab.classList.add('active');
            applyEmailFilter(filter);
        }

        function applyEmailFilter(filter) {
            activeEmailFilter = filter;
            if (filter.startsWith('folder:')) {
                activeMailSection = 'emails';
                const setDisplay = (id, val) => { const el = document.getElementById(id); if (el) el.style.display = val; };
                setDisplay('mailDashboardPanel', 'none');
                setDisplay('mailListPanel', 'flex');
                setDisplay('emailFolderBar', 'flex');
                setDisplay('mailManagePanel', 'none');
                setDisplay('mailProjectsPanel', 'none');
                setDisplay('mailEmailIdsPanel', 'none');
                setDisplay('mailBackupPanel', 'none');
                setEmailDashboardCollapsed(false);
            }
            syncMailTabStates();
            renderEmailModule();
        }

        function syncMailTabStates() {
            document.querySelectorAll('.mail-tab').forEach(tab => {
                const isActive = (activeEmailFilter === 'folder:inbox' && tab.dataset.folder === 'received') ||
                                 (activeEmailFilter === 'folder:sent' && tab.dataset.folder === 'sent');
                tab.classList.toggle('active', isActive);
            });
        }

        async function renderEmailModule() {
            const records = await getEmailRecords();
            renderEmailSummary(records);
            renderEmailList(records);
            renderEmailManagement();
            renderProjectAssignments();
            renderEmailIds();
            renderBackupRestore();
            syncEmailActiveStates();
        }

        function getPermissionRows(permissions) {
            return [
                { key: 'sendEmails', title: 'Send Emails', description: 'Employee can send an email', icon: 'mail' },
                { key: 'replyEmails', title: 'Reply to Emails', description: 'Employee can reply to an email', icon: 'reply' },
                { key: 'viewRealEmailIds', title: 'View Real Email Ids & Signatures', description: 'Employee can see real email ids and signatures', icon: 'eye' },
                { key: 'sendSpecificEmails', title: 'Send specific emails', description: 'Allow an Employee to send only specific emails', icon: 'mail', specific: true },
                { key: 'projectBasedEmails', title: 'Project-Based Emails', description: 'Enable only project based mails', icon: 'briefcase' },
                { key: 'blocked', title: 'Block | unblock user', description: permissions.blocked ? 'Blocked - Employee is logged out and cannot login' : 'Unblocked - Employee can login and use allowed access', icon: 'blocked' }
            ];
        }

        function permissionIcon(icon) {
            const icons = {
                mail: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>',
                reply: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>',
                eye: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
                briefcase: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path></svg>',
                blocked: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="m5.7 5.7 12.6 12.6"></path></svg>'
            };
            return icons[icon] || icons.mail;
        }

        function renderEmailManagement() {
            const permissions = getEmailPermissions();
            const permissionList = document.getElementById('permissionList');
            if (!permissionList) return;

            permissionList.innerHTML = getPermissionRows(permissions).map(row => `
                <div class="permission-card ${permissions[row.key] ? 'is-enabled' : ''}">
                    <span class="permission-icon">${permissionIcon(row.icon)}</span>
                    <span class="permission-copy">
                        <strong>${escapeHtml(row.title)}</strong>
                        <span>${escapeHtml(row.description)}</span>
                    </span>
                    <button class="toggle-switch ${permissions[row.key] ? 'is-on' : ''}" type="button" role="switch" aria-checked="${permissions[row.key]}" data-permission-key="${row.key}"></button>
                    ${row.specific ? `
                        <div class="permission-specific">
                            <input type="email" id="specificEmailInput" placeholder="David Lee@gmail.com" value="${escapeHtml(permissions.allowedEmails[0] || '')}" aria-label="Specific allowed email">
                            <button class="btn-outline-blue" type="button" onclick="addSpecificPermissionEmail()">+ Add Emails</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            document.querySelectorAll('[data-permission-key]').forEach(button => {
                button.addEventListener('click', () => toggleEmailPermission(button.dataset.permissionKey));
            });

            renderAllowedEmailList();
        }

        function toggleEmailPermission(key) {
            const permissions = getEmailPermissions();
            permissions[key] = !permissions[key];
            saveEmailPermissions(permissions);
            renderEmailManagement();
        }

        function normalizeEmailInput(value) {
            return value.trim();
        }

        function addSpecificPermissionEmail() {
            const input = document.getElementById('specificEmailInput');
            if (!input) return;
            addAllowedEmailValue(input.value);
            input.value = '';
        }

        function addAllowedEmail() {
            const input = document.getElementById('allowedEmailInput');
            if (!input) return;
            const value = normalizeEmailInput(input.value);
            if (!value) return;

            const permissions = getEmailPermissions();
            if (editingAllowedEmailIndex !== null) {
                permissions.allowedEmails[editingAllowedEmailIndex] = value;
                editingAllowedEmailIndex = null;
            } else if (!permissions.allowedEmails.some(email => email.toLowerCase() === value.toLowerCase())) {
                permissions.allowedEmails.push(value);
            }
            saveEmailPermissions(permissions);
            input.value = '';
            renderEmailManagement();
        }

        function addAllowedEmailValue(value) {
            const normalized = normalizeEmailInput(value);
            if (!normalized) return;
            const permissions = getEmailPermissions();
            if (!permissions.allowedEmails.some(email => email.toLowerCase() === normalized.toLowerCase())) {
                permissions.allowedEmails.push(normalized);
                permissions.sendSpecificEmails = true;
                saveEmailPermissions(permissions);
            }
            renderEmailManagement();
        }

        function editAllowedEmail(index) {
            const permissions = getEmailPermissions();
            const input = document.getElementById('allowedEmailInput');
            if (!input || !permissions.allowedEmails[index]) return;
            editingAllowedEmailIndex = index;
            input.value = permissions.allowedEmails[index];
            input.focus();
        }

        function deleteAllowedEmail(index) {
            const permissions = getEmailPermissions();
            permissions.allowedEmails.splice(index, 1);
            if (editingAllowedEmailIndex === index) editingAllowedEmailIndex = null;
            saveEmailPermissions(permissions);
            renderEmailManagement();
        }

        function renderAllowedEmailList() {
            const permissions = getEmailPermissions();
            const list = document.getElementById('emailConfigList');
            if (!list) return;
            list.innerHTML = permissions.allowedEmails.map((email, index) => `
                <div class="email-config-row">
                    <span>${escapeHtml(email)}</span>
                    <span class="email-row-actions">
                        <button class="icon-action-btn" type="button" onclick="editAllowedEmail(${index})" aria-label="Edit email">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                        </button>
                        <button class="icon-action-btn" type="button" onclick="deleteAllowedEmail(${index})" aria-label="Delete email">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                        </button>
                    </span>
                </div>
            `).join('');
        }

        function getCurrentEmployeeName() {
            const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            const seat = currentProfileIndex !== null ? seats[currentProfileIndex] : null;
            if (seat && seat.status !== 'empty') return `${seat.firstName} ${seat.lastName}`.trim();
            return 'Muzamil Khan';
        }

        function renderProjectAssignments() {
            const projects = getProjectAssignments();
            const filteredProjects = projects.filter(project => {
                if (!projectSearchQuery.trim()) return true;
                const query = projectSearchQuery.trim().toLowerCase();
                return `${project.projectName} ${project.client} ${project.leader} ${project.employeeName} ${project.projectEmailId}`.toLowerCase().includes(query);
            });
            const list = document.getElementById('projectCardList');
            if (!list) return;
            document.getElementById('projectEmployeeName').textContent = getCurrentEmployeeName();
            document.getElementById('projectTotalCount').textContent = projects.length;

            list.innerHTML = filteredProjects.map((project, index) => `
                <section class="project-card" data-project-id="${escapeHtml(project.id)}">
                    <div class="project-card-head">
                        <h3>${index + 1}. Project Details</h3>
                        <button class="btn-remove-employee" type="button" onclick="removeEmployeeFromProject('${escapeHtml(project.id)}')">
                            <span>×</span>
                            Remove employee
                        </button>
                    </div>
                    <div class="project-form-grid">
                        <div class="project-field">
                            <label>Project name</label>
                            <input type="text" value="${escapeHtml(project.projectName)}" placeholder="Enter project name" data-project-field="projectName" data-project-id="${escapeHtml(project.id)}">
                        </div>
                        <div class="project-field">
                            <label>Employee name</label>
                            <input type="text" value="${escapeHtml(project.employeeName)}" placeholder="Employee name" data-project-field="employeeName" data-project-id="${escapeHtml(project.id)}">
                        </div>
                        <div class="project-field">
                            <label>Select client</label>
                            <input type="text" value="${escapeHtml(project.client)}" placeholder="Select client" data-project-field="client" data-project-id="${escapeHtml(project.id)}">
                        </div>
                        <div class="project-field">
                            <label>Projects email ID</label>
                            <input type="email" value="${escapeHtml(project.projectEmailId)}" placeholder="Project email id" data-project-field="projectEmailId" data-project-id="${escapeHtml(project.id)}">
                        </div>
                        <div class="project-field full">
                            <label>Project leader</label>
                            <select data-project-field="leader" data-project-id="${escapeHtml(project.id)}">
                                ${['Yash', 'Rahul Singh', 'Nouman Azam', 'Sayem uddin'].map(name => `<option value="${escapeHtml(name)}" ${project.leader === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </section>
            `).join('');

            document.querySelectorAll('[data-project-field]').forEach(input => {
                input.addEventListener('change', () => updateProjectField(input.dataset.projectId, input.dataset.projectField, input.value));
                input.addEventListener('input', () => {
                    if (input.tagName !== 'SELECT') updateProjectField(input.dataset.projectId, input.dataset.projectField, input.value);
                });
            });
        }

        function updateProjectField(projectId, field, value) {
            const projects = getProjectAssignments();
            const project = projects.find(item => item.id === projectId);
            if (!project) return;
            project[field] = value;
            saveProjectAssignments(projects);
        }

        function removeEmployeeFromProject(projectId) {
            const projects = getProjectAssignments();
            const project = projects.find(item => item.id === projectId);
            if (!project) return;
            project.employeeName = '';
            saveProjectAssignments(projects);
            renderProjectAssignments();
            openModal('projectRemoveModal');
        }

        function renderStatusBadge(status) {
            const normalized = status.toLowerCase();
            return `<span class="email-status-badge ${normalized}">${escapeHtml(status)}</span>`;
        }

        function renderSignature(signature) {
            if (signature.toLowerCase() === 'photo') {
                return '<span class="signature-photo">Photo</span>';
            }
            return `<span class="signature-preview">${escapeHtml(signature)}</span>`;
        }

        function renderEmailIds() {
            const records = getEmailIdRecords();
            const query = emailIdsSearchQuery.trim().toLowerCase();
            const filtered = records.filter(record => {
                if (!query) return true;
                return `${record.realEmail} ${record.cloneEmail} ${record.leader} ${record.projectName} ${record.emailNo} ${record.signature} ${record.status}`.toLowerCase().includes(query);
            });
            const body = document.getElementById('emailIdsTableBody');
            if (!body) return;
            body.innerHTML = filtered.map(record => `
                <tr data-email-id-record="${escapeHtml(record.id)}">
                    <td>${escapeHtml(record.realEmail)}</td>
                    <td>${escapeHtml(record.cloneEmail)}</td>
                    <td>${escapeHtml(record.leader)}</td>
                    <td>${escapeHtml(record.projectName)}</td>
                    <td>${escapeHtml(record.emailNo)}</td>
                    <td>${renderSignature(record.signature)}</td>
                    <td>${renderStatusBadge(record.status)}</td>
                </tr>
            `).join('');
        }

        function getBackupEmployeeInfo() {
            const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            const seat = currentProfileIndex !== null ? seats[currentProfileIndex] : null;
            const state = getBackupState();
            if (seat && seat.status !== 'empty') {
                return {
                    name: `${seat.firstName} ${seat.lastName}`.trim(),
                    email: seat.email || state.email
                };
            }
            return { name: state.employeeName, email: state.email };
        }

        function renderBackupRestore() {
            const state = getBackupState();
            const employee = getBackupEmployeeInfo();
            const percent = state.storagePercentUsed ?? (state.storageTotalGb ? Math.round((state.storageUsedGb / state.storageTotalGb) * 100) : 0);
            const profileName = document.getElementById('backupEmployeeName');
            if (!profileName) return;

            profileName.textContent = employee.name;
            document.getElementById('backupEmployeeEmail').textContent = employee.email;
            document.getElementById('backupProjectsCount').textContent = state.projectsCount;
            document.getElementById('backupStorageUsed').textContent = `${state.storageTotalGb} GB`;
            document.getElementById('backupStoragePercent').textContent = `${percent}% Used`;
            document.getElementById('storageUsedValue').textContent = `${state.storageUsedGb} GB`;
            document.getElementById('storageTotalValue').textContent = `${state.storageTotalGb} GB`;
            document.getElementById('storageProgressFill').style.width = `${Math.min(percent, 100)}%`;
            document.getElementById('storageUpgradeMessage').textContent = `You have used ${state.storageUsedGb} GB of your ${state.storageTotalGb} GB storage capacity. Consider upgrading your plan for more space.`;
            document.getElementById('backupMessagesUsage').textContent = `${state.messageStorageGb} GB`;
            document.getElementById('backupAttachmentsUsage').textContent = `${state.attachmentStorageGb} GB`;
            document.getElementById('backupArchiveUsage').textContent = `${state.archiveStorageGb} GB`;

            const toggle = document.getElementById('emailStorageToggle');
            const body = document.getElementById('emailStorageBody');
            toggle.setAttribute('aria-expanded', state.accordionOpen);
            body.style.display = state.accordionOpen ? 'block' : 'none';
            document.querySelector('.backup-accordion').classList.toggle('open', state.accordionOpen);
        }

        function toggleEmailStorageAccordion() {
            const state = getBackupState();
            state.accordionOpen = !state.accordionOpen;
            saveBackupState(state);
            renderBackupRestore();
        }

        function startNewBackup() {
            const state = getBackupState();
            state.backupsStarted += 1;
            state.archiveStorageGb = Number((state.archiveStorageGb + 0.2).toFixed(1));
            state.storageUsedGb = Math.min(state.storageTotalGb, Number((state.storageUsedGb + 0.2).toFixed(1)));
            state.storagePercentUsed = Math.min(100, (state.storagePercentUsed ?? 80) + 1);
            saveBackupState(state);
            renderBackupRestore();
            openModal('backupStartedModal');
        }

        function setEmailDashboardCollapsed(collapsed) {
            const emailModule = document.getElementById('emailModuleView');
            const shouldCollapse = activeMailSection === 'dashboard' && collapsed;
            isDashboardCollapsed = shouldCollapse;
            emailModule.classList.toggle('mail-dashboard-collapsed', shouldCollapse);
        }

        function resetEmailDashboardScrollState() {
            const tableWrap = document.querySelector('.mail-table-wrap');
            if (tableWrap) tableWrap.scrollTop = 0;
            setEmailDashboardCollapsed(false);
        }

        function handleEmailContentScroll() {
            if (activeMailSection !== 'dashboard') return;
            const tableWrap = document.querySelector('.mail-table-wrap');
            if (!tableWrap) return;
            setEmailDashboardCollapsed(tableWrap.scrollTop > EMAIL_DASHBOARD_COLLAPSE_THRESHOLD);
        }

        function handleEmailModuleWheel(event) {
            if (activeMailSection !== 'dashboard') return;
            const tableWrap = document.querySelector('.mail-table-wrap');
            if (!tableWrap) return;

            if (event.deltaY > 0 && !isDashboardCollapsed) {
                setEmailDashboardCollapsed(true);
                tableWrap.scrollTop += event.deltaY;
            }

            if (event.deltaY < 0 && tableWrap.scrollTop <= EMAIL_DASHBOARD_COLLAPSE_THRESHOLD) {
                setEmailDashboardCollapsed(false);
            }
        }

        function activateTopTab(tabId) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const tab = document.getElementById(tabId);
            if (tab) tab.classList.add('active');
        }

        function activateProfileSubtab(section) {
            document.querySelectorAll('.profile-tab[data-profile-section]').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.profileSection === section);
            });
        }

        function showSelectedEmployeeProfile() {
            document.getElementById('subscriptionView').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('employeeTableContainer').style.display = 'none';
            document.getElementById('employeesView').style.display = 'flex';
            document.getElementById('employeesView').classList.add('has-table');
            activateTopTab('tabEmployees');
            activateProfileSubtab('profile');

            if (currentProfileIndex !== null) {
                selectEmployee(currentProfileIndex);
            } else {
                document.getElementById('profileViewContainer').style.display = 'flex';
            }
        }

        function showEmailModule(section = 'dashboard', fromEmployeeContext = false) {
            document.getElementById('subscriptionView').style.display = 'none';
            document.getElementById('mailSettingsPanel').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('employeeTableContainer').style.display = 'none';
            document.getElementById('profileViewContainer').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'flex';
            document.getElementById('employeesView').style.display = 'flex';
            document.getElementById('employeesView').classList.add('has-table');

            // Top tab & bottom subnav depend on context:
            // - From Employees sub-tabs: keep Employees active, show subnav
            // - From top Email tab: set Email active, hide subnav
            activateTopTab(fromEmployeeContext ? 'tabEmployees' : 'tabEmail');
            const mailSubnav = document.querySelector('.mail-subnav');
            if (mailSubnav) mailSubnav.style.display = fromEmployeeContext ? '' : 'none';

            activateProfileSubtab(section);
            setMailSection(section, section === 'emails' ? 'folder:inbox' : activeEmailFilter);
        }

        // ---- Modal Logic ----
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
            // Trap focus on ESC
            document.addEventListener('keydown', handleEsc);
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
            document.removeEventListener('keydown', handleEsc);
        }

        function handleEsc(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => {
                    m.classList.remove('active');
                });
                document.removeEventListener('keydown', handleEsc);
            }
        }

        // Close on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });

        // ---- Quantity Logic ----
        function updateQuantity(change) {
            const newVal = currentQuantity + change;
            if (newVal >= 1 && newVal <= 999) {
                currentQuantity = newVal;
                document.getElementById('employeeQuantity').textContent = currentQuantity;
            }
        }

        // ---- Flow: Add Employees → Plan Selection ----
        function proceedToPlan() {
            closeModal('addEmployeesModal');
            updatePlanSummary();
            // Small delay so close animation finishes before open
            setTimeout(() => openModal('planModal'), 100);
        }

        // ---- Billing Cycle Toggle ----
        function setBillingCycle(cycle) {
            billingCycle = cycle;
            document.getElementById('toggleMonthly').classList.toggle('active', cycle === 'monthly');
            document.getElementById('toggleYearly').classList.toggle('active', cycle === 'yearly');
            document.getElementById('toggleMonthly').setAttribute('aria-selected', cycle === 'monthly');
            document.getElementById('toggleYearly').setAttribute('aria-selected', cycle === 'yearly');
            updatePlanSummary();
        }

        // ---- Update Plan Summary ----
        function updatePlanSummary() {
            const isMonthly = billingCycle === 'monthly';
            const pricePerUser = isMonthly ? PRICE_PER_USER_MONTH : PRICE_PER_USER_YEAR;
            const total = pricePerUser * currentQuantity;

            document.getElementById('planCardTitle').textContent = isMonthly ? 'Monthly Plan' : 'Yearly Plan';
            document.getElementById('planCardPrice').textContent = pricePerUser;
            document.getElementById('planCardPeriod').textContent = isMonthly ? 'Per month per employee' : 'Per year per employee';
            document.getElementById('planCardTotal').textContent = 'Total: Rs ' + total;

            document.getElementById('summaryEmployeesBadge').textContent = currentQuantity;
            document.getElementById('summaryPlanName').textContent = isMonthly ? 'Monthly' : 'Yearly';
            document.getElementById('summaryEmployeeCount').textContent = currentQuantity + ' Users';
            document.getElementById('summaryAmount').textContent = 'Rs' + total;
            document.getElementById('summaryTotal').textContent = 'Rs' + total;
        }

        // ---- Process Payment (Immediately opens Razorpay) ----
        function processPayment() {
            const isMonthly = billingCycle === 'monthly';
            const pricePerUser = isMonthly ? PRICE_PER_USER_MONTH : PRICE_PER_USER_YEAR;
            currentTotal = pricePerUser * currentQuantity;

            // Trigger Razorpay directly from the modal's Proceed Payment button
            processFinalPayment('btnProceedPayment');
        }

        // ---- Tab click handler ----
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                if (this.id === 'tabEmail') {
                    showEmailModule('dashboard');
                    return;
                }
                if (this.id === 'tabEmployees') {
                    resetToHome();
                    return;
                }

                // Hide all sub-views including bottom navbar containers
                document.getElementById('emailModuleView').style.display = 'none';
                document.getElementById('subscriptionView').style.display = 'none';
                document.getElementById('mailSettingsPanel').style.display = 'none';
                document.getElementById('profileViewContainer').style.display = 'none';
                document.getElementById('employeesView').style.display = 'flex';
                document.getElementById('employeesView').classList.remove('has-table');

                // Show appropriate content for the Employees view area
                const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
                const hasFilled = seats.some(s => s && s.status !== 'empty');
                document.getElementById('emptyState').style.display = hasFilled ? 'none' : 'flex';
                document.getElementById('employeeTableContainer').style.display = 'none';

                document.querySelectorAll('.tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
            });
        });

        document.querySelectorAll('.mail-summary-card').forEach(card => {
            card.addEventListener('click', () => {
                setMailSection('dashboard');
                applyEmailFilter(card.dataset.emailFilter);
            });
        });

        document.querySelectorAll('.email-folder').forEach(folder => {
            folder.addEventListener('click', () => applyEmailFilter(folder.dataset.emailFilter));
        });

        document.querySelectorAll('.mail-subtab[data-mail-section]').forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.dataset.mailSection;
                if (section === 'profile') {
                    showSelectedEmployeeProfile();
                    return;
                }
                showEmailModule(section, true);
            });
        });

        document.querySelectorAll('.profile-tab[data-profile-section]').forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.dataset.profileSection;
                if (section === 'profile') {
                    showSelectedEmployeeProfile();
                    return;
                }
                showEmailModule(section, true);
            });
        });

        document.getElementById('emailSearchInput').addEventListener('input', (e) => {
            emailSearchQuery = e.target.value;
            document.getElementById('topbarSearch').value = emailSearchQuery;
            renderEmailModule();
        });

        document.getElementById('topbarSearch').addEventListener('input', (e) => {
            if (document.getElementById('emailModuleView').style.display !== 'none') {
                emailSearchQuery = e.target.value;
                document.getElementById('emailSearchInput').value = emailSearchQuery;
                renderEmailModule();
            }
        });

        document.getElementById('projectSearchInput').addEventListener('input', (e) => {
            projectSearchQuery = e.target.value;
            renderProjectAssignments();
        });

        document.getElementById('emailIdsSearchInput').addEventListener('input', (e) => {
            emailIdsSearchQuery = e.target.value;
            renderEmailIds();
        });

        document.getElementById('emailStorageToggle').addEventListener('click', toggleEmailStorageAccordion);

        document.querySelector('.mail-table-wrap').addEventListener('scroll', handleEmailContentScroll);
        document.getElementById('emailModuleView').addEventListener('wheel', handleEmailModuleWheel, { passive: true });

        // ==========================================
        //         PAYMENT FLOW WIZARD LOGIC
        // ==========================================
        let selectedPaymentMethod = 'Credit Card';
        let currentTotal = 0;

        function startPaymentFlow() {
            // Update Summary Box with current state
            const isMonthly = billingCycle === 'monthly';
            const pricePerUser = isMonthly ? PRICE_PER_USER_MONTH : PRICE_PER_USER_YEAR;
            currentTotal = pricePerUser * currentQuantity;

            document.getElementById('flowSummaryPlan').textContent = isMonthly ? 'Monthly' : 'Yearly';
            document.getElementById('flowSummaryEmployees').textContent = currentQuantity + ' Users';
            document.getElementById('flowSummaryAmount').textContent = 'Rs' + currentTotal;
            document.getElementById('flowSummaryTotal').textContent = 'Rs' + currentTotal;

            // Switch UI Views
            document.getElementById('employeesView').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('employeeTableContainer').style.display = 'none';
            document.getElementById('profileViewContainer').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'none';
            document.getElementById('subscriptionView').style.display = 'flex';
            
            // Switch Tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tabSubscription').classList.add('active');

            // Start at Step 1
            goToStep(1);
        }

        function goToStep(step) {
            // Content visibility
            document.querySelectorAll('.payment-step-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`step${step}Content`).classList.add('active');

            // Hide summary box on Step 2 (success)
            if (step === 2) {
                document.getElementById('paymentSummaryBox').style.display = 'none';
                document.querySelector('.payment-header').style.display = 'none';
                document.getElementById('paymentStepper').style.display = 'none';
            } else {
                document.getElementById('paymentSummaryBox').style.display = 'block';
                document.querySelector('.payment-header').style.display = 'flex';
                document.getElementById('paymentStepper').style.display = 'flex';
            }

            // Stepper active states
            const s1 = document.getElementById('step1Indicator');
            const s2 = document.getElementById('step2Indicator');
            const l1 = document.getElementById('line1');

            // Reset
            s1.className = 'step'; s2.className = 'step';
            l1.className = 'step-line';

            if (step >= 1) s1.className = 'step active';
            if (step >= 2) {
                s1.className = 'step completed';
                l1.className = 'step-line completed';
                s2.className = 'step active completed';
            }
        }

        function selectPaymentMethod(element, method) {
            document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
            element.classList.add('active');
            selectedPaymentMethod = method;
        }

        let currentTxnId = '';

        function buildTransactionId(prefix = 'TXN') {
            return `${prefix}-${Date.now().toString().slice(-9)}`;
        }

        function completeSuccessfulPayment(txnId, methodLabel) {
            const isMonthly = billingCycle === 'monthly';
            currentTxnId = txnId;

            const today = new Date();
            const nextDate = new Date();
            if (isMonthly) {
                nextDate.setMonth(nextDate.getMonth() + 1);
            } else {
                nextDate.setFullYear(nextDate.getFullYear() + 1);
            }

            const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
            const strToday = today.toLocaleDateString('en-US', dateOptions);
            const strNext = nextDate.toLocaleDateString('en-US', dateOptions);

            document.getElementById('successTxnId').textContent = currentTxnId;
            document.getElementById('receiptId').textContent = currentTxnId;
            document.getElementById('successPlan').textContent = `${isMonthly ? 'Monthly' : 'Yearly'} Plan (${currentQuantity} Users)`;
            document.getElementById('successAmount').textContent = `Rs ${currentTotal}`;
            document.getElementById('successMethod').textContent = methodLabel;
            document.getElementById('successDate').textContent = strToday;
            document.getElementById('successNextDate').textContent = strNext;

            let seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            if (seats.length !== currentQuantity) {
                seats = Array(currentQuantity).fill(null).map(() => ({
                    status: 'empty',
                    firstName: '',
                    lastName: '',
                    email: ''
                }));
                localStorage.setItem('purchasedSeats', JSON.stringify(seats));
            }

            localStorage.setItem('purchasedQuantity', currentQuantity);
            localStorage.setItem('purchasedPlan', isMonthly ? 'Monthly' : 'Yearly');
            document.getElementById('sidebarTotalEmployees').textContent = currentQuantity;

            // Ensure subscription view is visible for the success screen
            document.getElementById('employeesView').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('employeeTableContainer').style.display = 'none';
            document.getElementById('profileViewContainer').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'none';
            document.getElementById('subscriptionView').style.display = 'flex';
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tabSubscription').classList.add('active');

            goToStep(2);
        }

        async function processFinalPayment(btnId = 'btnProceedPayment') {
            const btn = document.getElementById(btnId);
            const originalText = btn ? btn.textContent : 'Proceed Payment';
            if (btn) {
                btn.textContent = 'Initializing...';
                btn.disabled = true;
            }

            try {
                if (typeof Razorpay === 'undefined') {
                    throw new Error('Razorpay script is not loaded. Please check your internet connection.');
                }

                const API_BASE = (window.location.protocol === 'file:' || window.location.port !== '3000') 
                    ? 'http://localhost:3000' 
                    : '';

                // 1. Create order on backend
                const response = await fetch(API_BASE + '/api/payment/razorpay-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: currentTotal })
                });

                if (!response.ok) {
                    throw new Error(`Backend server returned ${response.status}. Make sure the Node server (server.js) is running on port 3000.`);
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || 'Failed to initialize payment order.');
                }

                // 2. Open Razorpay Checkout
                const options = {
                    key: 'rzp_test_T0qGvs8egbRbcW',
                    amount: data.order.amount,
                    currency: "INR",
                    name: "Safemailz",
                    description: "Subscription Payment",
                    order_id: data.order.id,
                    handler: async function (response) {
                        if (btn) btn.textContent = 'Verifying...';
                        
                        try {
                            // 3. Verify on backend
                            const verifyRes = await fetch(API_BASE + '/api/payment/razorpay-verify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature
                                })
                            });
                            const verifyData = await verifyRes.json();

                            if (verifyData.success) {
                                closeModal('planModal'); // Ensure modal is closed
                                completeSuccessfulPayment(verifyData.txnId, 'Razorpay Gateway');
                            } else {
                                throw new Error(verifyData.message || 'Payment verification failed.');
                            }
                        } catch (err) {
                            alert(err.message);
                            if (btn) {
                                btn.textContent = originalText;
                                btn.disabled = false;
                            }
                        }
                    },
                    prefill: {
                        name: "Safemailz User",
                        contact: "9999999999"
                    },
                    theme: {
                        color: "#1A6BA8"
                    },
                    modal: {
                        ondismiss: function() {
                            if (btn) {
                                btn.textContent = originalText;
                                btn.disabled = false;
                            }
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function (response){
                    console.warn("Payment failed: ", response.error.description);
                    alert("Payment Failed: " + response.error.description);
                    if (btn) {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }
                });
                rzp.open();

            } catch (error) {
                console.error(error);
                alert('Error: ' + error.message);
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            }
        }

        function downloadInvoice() {
            if (!currentTxnId) return;
            const isMonthly = billingCycle === 'monthly';
            const planName = `${isMonthly ? 'Monthly' : 'Yearly'} Plan (${currentQuantity} Users)`;
            
            const today = new Date();
            const nextDate = new Date();
            if (isMonthly) {
                nextDate.setMonth(nextDate.getMonth() + 1);
            } else {
                nextDate.setFullYear(nextDate.getFullYear() + 1);
            }
            const options = { day: 'numeric', month: 'long', year: 'numeric' };

            const params = new URLSearchParams({
                amount: currentTotal,
                plan: planName,
                method: selectedPaymentMethod,
                date: today.toLocaleDateString('en-US', options),
                nextDate: nextDate.toLocaleDateString('en-US', options)
            });

            // Open the PDF generation endpoint in a new tab to trigger download
            window.open(`/api/payment/invoice/${currentTxnId}?${params.toString()}`, '_blank');
        }

        function resetToHome() {
            // Restore views
            document.getElementById('subscriptionView').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'none';
            document.getElementById('mailSettingsPanel').style.display = 'none';
            document.getElementById('employeesView').style.display = 'flex';
            
            // Restore tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tabEmployees').classList.add('active');

            // Populate employee list
            populateEmployeeList(currentQuantity);
        }

        let selectedSeatIndex = null;
        let currentProfileIndex = null;

        function populateEmployeeList(count) {
            // Read seats from storage
            const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            
            // If we have seats, hide the main empty state (unless no employee selected)
            // But we will let the user click a card to see profile.
            // Initially, if no one is selected, we might just show the table or empty state.
            // Based on requirements: "The left panel should no longer show the 'No Employee added yet' state once seats exist."
            // We will hide the sidebar empty state, but let's hide main table for now and show profile if selected.
            document.getElementById('emptyState').style.display = 'flex';
            document.getElementById('employeeTableContainer').style.display = 'none';
            document.getElementById('profileViewContainer').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'none';
            document.getElementById('employeesView').classList.remove('has-table');

            // Populate sidebar list with tiles/cards
            const sidebarList = document.getElementById('sidebarEmployeeList');
            sidebarList.innerHTML = '';
            
            for (let i = 0; i < count; i++) {
                const seat = seats[i] || {status: 'empty'};
                const div = document.createElement('div');
                
                if (seat.status === 'empty') {
                    // Render "Add +" tile
                    div.className = 'sidebar-emp-add';
                    div.innerHTML = `
                        <div class="plus-icon">+</div>
                        <div>Add</div>
                    `;
                    div.onclick = () => openAddEmployeeModal(i);
                } else {
                    // Render filled profile card
                    div.className = 'sidebar-emp-card';
                    div.innerHTML = `
                        <div style="font-size: 0.7rem; color: #E91E63; font-weight: 600; background: #FCE4EC; padding: 0.15rem 0.4rem; border-radius: 10px; width: max-content; margin-bottom: 0.25rem;">Expire in 10 days</div>
                        <div class="sidebar-emp-header">
                            <span class="name-placeholder">${i + 1}. ${seat.firstName} ${seat.lastName}</span>
                            <div class="sidebar-emp-kebab">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </div>
                        </div>
                        <div style="font-size: 0.75rem; color: #666; display: flex; justify-content: space-between; margin-top: 0.25rem;">
                            <span>Storage</span>
                            <span>1.18 GB of 50 GB</span>
                        </div>
                        <div style="width: 100%; height: 4px; background: #E0E0E0; border-radius: 2px; margin-top: 0.25rem;">
                            <div style="width: 5%; height: 100%; background: #1A6BA8; border-radius: 2px;"></div>
                        </div>
                    `;
                    div.onclick = () => selectEmployee(i);
                }
                sidebarList.appendChild(div);
            }

            // Hide empty state in sidebar
            document.getElementById('sidebarEmptyState').style.display = 'none';
            document.getElementById('sidebarTotalEmployees').textContent = count;
        }

        function openAddEmployeeModal(index) {
            selectedSeatIndex = index;
            document.getElementById('newEmpFirstName').value = '';
            document.getElementById('newEmpLastName').value = '';
            document.getElementById('newEmpEmail').value = '';
            document.getElementById('addEmployeeFormModal').classList.add('active');
        }

        function saveNewEmployee() {
            const firstName = document.getElementById('newEmpFirstName').value.trim();
            const lastName = document.getElementById('newEmpLastName').value.trim();
            const email = document.getElementById('newEmpEmail').value.trim();
            
            if (!firstName || !email) {
                alert("First Name and Email are required.");
                return;
            }

            let seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            if (selectedSeatIndex !== null && seats[selectedSeatIndex]) {
                seats[selectedSeatIndex] = {
                    status: 'filled',
                    firstName,
                    lastName,
                    email
                };
                localStorage.setItem('purchasedSeats', JSON.stringify(seats));
            }

            document.getElementById('addEmployeeFormModal').classList.remove('active');
            populateEmployeeList(currentQuantity);
            
            // Automatically select the newly created employee
            selectEmployee(selectedSeatIndex);
        }

        function selectEmployee(index) {
            const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            const seat = seats[index];
            if (!seat || seat.status === 'empty') return;
            currentProfileIndex = index;

            // Hide empty state and table
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('employeeTableContainer').style.display = 'none';
            document.getElementById('emailModuleView').style.display = 'none';
            
            // Show Profile View
            document.getElementById('employeesView').classList.add('has-table');
            document.getElementById('profileViewContainer').style.display = 'flex';
            activateProfileSubtab('profile');

            // Populate profile view
            document.getElementById('profFirstName').value = seat.firstName + ' ' + seat.lastName;
            document.getElementById('profEmail').value = seat.email;
            document.getElementById('profileAvatarInitial').textContent = seat.firstName.charAt(0).toUpperCase();
        }

        // Close form modal when clicking outside
        document.getElementById('addEmployeeFormModal').addEventListener('click', (e) => {
            if (e.target.id === 'addEmployeeFormModal') {
                e.target.classList.remove('active');
            }
        });

        // On page load, restore purchased state
        document.addEventListener('DOMContentLoaded', () => {
            renderEmailModule();
            const savedQuantity = localStorage.getItem('purchasedQuantity');
            if (savedQuantity && parseInt(savedQuantity) > 0) {
                currentQuantity = parseInt(savedQuantity);
                populateEmployeeList(currentQuantity);
            }
        });
        // ===== PROFILE & SETTINGS =====
        function toggleProfileDropdown() {
            const dropdown = document.getElementById('profileDropdown');
            dropdown.classList.toggle('hidden');
        }

        // Close dropdown when clicking outside
        window.addEventListener('click', function(e) {
            if (!e.target.closest('.profile-dropdown-container')) {
                const dropdown = document.getElementById('profileDropdown');
                if (dropdown && !dropdown.classList.contains('hidden')) {
                    dropdown.classList.add('hidden');
                }
            }
        });

        function handleLogout() {
            localStorage.removeItem('currentUser');
            window.location.href = 'signin.html';
        }

        async function openSettingsPanel(sectionId) {
            // Hide dropdown
            document.getElementById('profileDropdown').classList.add('hidden');
            
            // Hide ALL top-level views
            const viewsToHide = [
                'employeesView', 'emailModuleView', 'subscriptionView'
            ];
            viewsToHide.forEach(p => {
                const el = document.getElementById(p);
                if(el) el.style.display = 'none';
            });
            
            // Remove active state from all main tabs
            document.querySelectorAll('.tab, .mail-subtab, .mail-tab').forEach(t => t.classList.remove('active'));

            // Show settings panel
            document.getElementById('mailSettingsPanel').style.display = 'block';

            // Scroll to section if provided
            if (sectionId) {
                setTimeout(() => {
                    const el = document.getElementById(sectionId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }

            // Fetch profile data
            try {
                const response = await fetch('/api/settings/profile', { headers: getHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    const { user, organization } = data.profile;
                    
                    // Account Info card
                    document.getElementById('settingsUserName').textContent = user.admin_name;
                    document.getElementById('settingsUserEmail').textContent = user.email;
                    document.getElementById('settingsUserId').textContent = user.id;
                    document.getElementById('settingsUserRole').textContent = user.role;
                    document.getElementById('settingsUserStatus').textContent = user.status;
                    document.getElementById('settingsUserJoined').textContent = user.joined_date;
                    
                    // Org Info card
                    document.getElementById('settingsOrgName').textContent = organization.organization_name;
                    document.getElementById('settingsOrgId').textContent = organization.id;
                    document.getElementById('settingsOrgSize').textContent = organization.organization_size;
                    document.getElementById('settingsOrgBackup').textContent = organization.backup_email || 'N/A';
                    document.getElementById('settingsOrgJoined').textContent = organization.joined_date;

                    // Signup Details card — every field that was collected during signup
                    document.getElementById('signupOrgName').textContent = organization.organization_name;
                    document.getElementById('signupAdminName').textContent = user.admin_name;
                    document.getElementById('signupEmail').textContent = user.email;
                    document.getElementById('signupOrgSize').textContent = organization.organization_size;
                    document.getElementById('signupBackupEmail').textContent = organization.backup_email || 'Not provided';
                    document.getElementById('signupMarketing').textContent = user.marketing_opt_in ? 'Yes' : 'No';
                    document.getElementById('signupTerms').textContent = user.terms_accepted ? 'Yes' : 'No';
                    document.getElementById('signupCreatedAt').textContent = user.joined_date;
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        }

        async function handleChangePassword() {
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            const alertBox = document.getElementById('passwordAlert');
            
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
            
            if (newPass !== confirm) {
                alertBox.textContent = 'New passwords do not match';
                alertBox.classList.add('error');
                alertBox.style.display = 'block';
                return;
            }
            if (newPass.length < 6) {
                alertBox.textContent = 'Password must be at least 6 characters';
                alertBox.classList.add('error');
                alertBox.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/api/settings/password', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ currentPassword: current, newPassword: newPass })
                });
                const data = await response.json();
                
                if (response.ok) {
                    alertBox.textContent = data.message;
                    alertBox.classList.add('success');
                    document.getElementById('changePasswordForm').reset();
                } else {
                    alertBox.textContent = data.error || 'Failed to update password';
                    alertBox.classList.add('error');
                }
                alertBox.style.display = 'block';
            } catch (err) {
                alertBox.textContent = 'Server error occurred';
                alertBox.classList.add('error');
                alertBox.style.display = 'block';
            }
        }
    