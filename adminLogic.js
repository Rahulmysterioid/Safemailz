        // ==========================================
        // ===== ADMINS MODULE LOGIC =====
        // ==========================================
        async function initAdmins() {
            try {
                const res = await fetch('/api/settings/admins', { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    adminsList = data.admins || [];
                    localStorage.setItem('safemailzAdmins', JSON.stringify(adminsList));
                } else {
                    adminsList = [];
                }
            } catch (err) {
                console.error("Failed to load admins:", err);
                adminsList = JSON.parse(localStorage.getItem('safemailzAdmins')) || [];
            }

            // Default selection
            if (adminsList.length > 0 && !selectedAdminId) {
                selectedAdminId = String(adminsList[0].id);
            }
            reloadSelectedAdminData();

            if (typeof renderAdmins === 'function') {
                renderAdmins();
            }
        }

        function reloadSelectedAdminData() {
            if (!selectedAdminId) {
                selectedAdminData = null;
            } else {
                const found = adminsList.find(a => String(a.id) === String(selectedAdminId));
                if (found) {
                    selectedAdminData = JSON.parse(JSON.stringify(found));
                } else {
                    selectedAdminId = null;
                    selectedAdminData = null;
                }
            }
            populateAdminForm();
        }

        function populateAdminForm() {
            const emptyState = document.getElementById('adminDetailsEmptyState');
            const detailsContent = document.getElementById('adminDetailsContent');

            if (!selectedAdminData) {
                if (emptyState) emptyState.style.display = 'flex';
                if (detailsContent) detailsContent.style.display = 'none';

                const nameInput = document.getElementById('adminNameInput');
                const emailInput = document.getElementById('adminEmailInput');
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.disabled = true;
                }
                if (emailInput) {
                    emailInput.value = '';
                    emailInput.disabled = true;
                }
                updatePermissionUI();
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            if (detailsContent) detailsContent.style.display = 'block';

            const nameInput = document.getElementById('adminNameInput');
            const emailInput = document.getElementById('adminEmailInput');
            if (nameInput) {
                nameInput.disabled = false;
                nameInput.value = selectedAdminData.name || '';
            }
            if (emailInput) {
                emailInput.disabled = false;
                emailInput.value = selectedAdminData.email || '';
            }
            updatePermissionUI();
        }

        function updatePermissionUI() {
            const perms = selectedAdminData ? selectedAdminData.permissions : {};

            const rows = [
                { key: 'addEmployees', cardId: 'adminCardAddEmployees', switchId: 'switchAddEmployees' },
                { key: 'createProjects', cardId: 'adminCardCreateProjects', switchId: 'switchCreateProjects' },
                { key: 'manageProjects', cardId: 'adminCardManageProjects', switchId: 'switchManageProjects' },
                { key: 'makeAdmin', cardId: 'adminCardMakeAdmin', switchId: 'switchMakeAdmin' },
                { key: 'deleteProject', cardId: 'adminCardDeleteProject', switchId: 'switchDeleteProject' }
            ];

            rows.forEach(r => {
                const isEnabled = !!perms[r.key];
                const card = document.getElementById(r.cardId);
                const sw = document.getElementById(r.switchId);

                if (card) {
                    card.classList.toggle('is-enabled', isEnabled);
                    if (!selectedAdminData) {
                        card.style.opacity = '0.5';
                        card.style.pointerEvents = 'none';
                    } else {
                        card.style.opacity = '1';
                        card.style.pointerEvents = 'auto';
                    }
                }
                if (sw) {
                    sw.classList.toggle('is-on', isEnabled);
                    sw.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
                }
            });
        }

        function clickAdminPermToggle(key) {
            if (!selectedAdminData) return;
            selectedAdminData.permissions[key] = !selectedAdminData.permissions[key];
            updatePermissionUI();
        }

        function renderAdmins() {
            const sidebarList = document.getElementById('sidebarAdminList');
            if (!sidebarList) return;

            const query = adminsSearchQuery.trim().toLowerCase();
            const filtered = adminsList.filter(a => {
                if (!query) return true;
                return (a.name || '').toLowerCase().includes(query) || (a.email || '').toLowerCase().includes(query);
            });

            // Update stats
            const statsSpan = document.getElementById('sidebarTotalAdmins');
            if (statsSpan) statsSpan.textContent = filtered.length;

            if (filtered.length === 0) {
                sidebarList.innerHTML = `
                    <div style="text-align: center; padding: 32px 16px; color: #666; background: #fff; border-radius: 8px; border: 1px dashed #ccc; margin-top: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; color: #999;">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <p style="font-size: 0.9rem; margin: 0;">No admins found</p>
                    </div>
                `;
                return;
            }

            sidebarList.innerHTML = filtered.map((a, index) => {
                const isActive = String(a.id) === String(selectedAdminId);

                // Expiry and storage details
                const expiryLabel = a.expiry || 'Expire in 10 days';
                const storageText = `Storage <span>${a.storageUsed || '1.18 GB'} of ${a.storageTotal || '50 GB'}</span>`;

                // Storage percent calculation
                let percent = 5;
                if (a.storageUsed && a.storageTotal) {
                    const used = parseFloat(a.storageUsed);
                    const total = parseFloat(a.storageTotal);
                    if (!isNaN(used) && !isNaN(total) && total > 0) {
                        percent = Math.min(100, Math.round((used / total) * 100));
                    }
                }

                return `
                    <div class="admin-card ${isActive ? 'active-admin' : ''}" onclick="selectAdmin('${a.id}')">
                        <div class="admin-card-expiry">${escapeHtml(expiryLabel)}</div>
                        <div class="admin-card-header">
                            <span class="admin-card-name">${index + 1}. ${escapeHtml(a.name)}</span>
                            <div style="cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; color: #333;" onclick="event.stopPropagation(); toggleAdminKebabMenu('${a.id}', event)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </div>
                        </div>
                        <div class="admin-card-storage-label">
                            ${storageText}
                        </div>
                        <div class="admin-card-progress">
                            <div class="admin-card-progress-bar" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function selectAdmin(id) {
            selectedAdminId = String(id);
            reloadSelectedAdminData();
            renderAdmins();
        }

        function searchAdmins(val) {
            adminsSearchQuery = val;
            const input = document.getElementById('adminsSidebarSearch');
            if (input) input.value = val;
            renderAdmins();
        }

        async function saveAdminEdits() {
            if (!selectedAdminData) return;
            const nameVal = document.getElementById('adminNameInput').value.trim();
            const emailVal = document.getElementById('adminEmailInput').value.trim();

            if (!nameVal || !emailVal) {
                alert("Name and Email are required.");
                return;
            }

            selectedAdminData.name = nameVal;
            selectedAdminData.email = emailVal;

            try {
                // Save permissions to the backend
                const res = await fetch(`/api/settings/admins/${selectedAdminData.id}/permissions`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(selectedAdminData.permissions)
                });
                
                if (!res.ok) {
                    const errData = await res.json();
                    alert("Failed to save permissions: " + (errData.error || 'Unknown error'));
                    return;
                }
            } catch (err) {
                console.error("Error saving admin permissions:", err);
                alert("An error occurred while saving permissions.");
                return;
            }

            const index = adminsList.findIndex(a => String(a.id) === String(selectedAdminId));
            if (index !== -1) {
                adminsList[index] = JSON.parse(JSON.stringify(selectedAdminData));
                localStorage.setItem('safemailzAdmins', JSON.stringify(adminsList));
            }

            // Dynamically update UI if editing own permissions
            try {
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    let currentUser = JSON.parse(currentUserStr);
                    if (currentUser.email === selectedAdminData.email) {
                        currentUser.permissions = selectedAdminData.permissions;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        
                        // Dynamically update Add Project button visibility
                        const btnAddProject = document.getElementById('btnAddProject');
                        if (btnAddProject) {
                            if (!currentUser.permissions.createProjects) {
                                btnAddProject.style.display = 'none';
                            } else {
                                btnAddProject.style.display = ''; // Revert to CSS default (flex)
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error updating current user session:", e);
            }

            alert("Changes saved successfully!");
            renderAdmins();
        }

        function cancelAdminEdits() {
            reloadSelectedAdminData();
            alert("Changes discarded.");
        }

        window.adminSelectionCandidates = [];

        function openAdminSelectionModal() {
            const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
            const currentAdmins = JSON.parse(localStorage.getItem('safemailzAdmins')) || [];

            // Filter out empty seats and existing admins
            window.adminSelectionCandidates = seats.filter(s => {
                if (!s || s.status === 'empty') return false;
                const isAdmin = currentAdmins.some(a => a.email.toLowerCase() === s.email.toLowerCase());
                return !isAdmin;
            });

            const searchInput = document.getElementById('adminSelectionSearch');
            if (searchInput) searchInput.value = '';
            renderAdminSelectionList(window.adminSelectionCandidates);

            openModal('addAdminModal');
        }

        function filterAdminSelectionList(query) {
            const lowerQuery = query.trim().toLowerCase();
            const filtered = window.adminSelectionCandidates.filter(c => {
                const nameMatch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowerQuery);
                const emailMatch = c.email.toLowerCase().includes(lowerQuery);
                return nameMatch || emailMatch;
            });
            renderAdminSelectionList(filtered);
        }

        function renderAdminSelectionList(list) {
            const container = document.getElementById('adminSelectionEmployeeList');
            if (!container) return;

            if (!list || list.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: #666; font-size: 0.8rem; padding: 1rem;">No eligible employees found.</div>`;
                return;
            }

            container.innerHTML = list.map(emp => {
                const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;"
                         onmouseover="this.style.background='#F8FAFC'; this.style.borderColor='#1A6BA8'"
                         onmouseout="this.style.background='transparent'; this.style.borderColor='#E2E8F0'"
                         onclick="selectEmployeeForAdmin('${escapeHtml(emp.email)}', '${escapeHtml(fullName)}')">
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                            <span style="font-size: 0.85rem; font-weight: 600; color: #111;">${escapeHtml(fullName)}</span>
                            <span style="font-size: 0.75rem; color: #64748B;">${escapeHtml(emp.email)}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A6BA8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                `;
            }).join('');
        }

        function selectEmployeeForAdmin(email, name) {
            closeModal('addAdminModal');
            promptRoleChange(email, 'admin', name);
        }

        async function toggleAdminKebabMenu(id, event) {
            const adminToDelete = adminsList.find(a => String(a.id) === String(id));
            if (!adminToDelete) return;

            const confirmDelete = confirm("Do you want to delete this admin?");
            if (confirmDelete) {
                try {
                    // Update role to employee on backend
                    const response = await fetch(`/api/settings/employee/${encodeURIComponent(adminToDelete.email)}/role`, {
                        method: 'PUT',
                        headers: typeof getHeaders === 'function' ? getHeaders() : {},
                        body: JSON.stringify({ role: 'employee' })
                    });
                    
                    if (response.ok) {
                        // Update local purchasedSeats list so the Employees tab reflects it instantly
                        try {
                            const seats = JSON.parse(localStorage.getItem('purchasedSeats')) || [];
                            const seatIndex = seats.findIndex(s => s && s.email === adminToDelete.email);
                            if (seatIndex > -1) {
                                seats[seatIndex].role = 'employee';
                                localStorage.setItem('purchasedSeats', JSON.stringify(seats));
                                if (typeof populateEmployeeList === 'function') {
                                    populateEmployeeList(seats.length);
                                }
                            }
                        } catch (e) {
                            console.error("Error updating local seats:", e);
                        }

                        // Remove from local admins list
                        adminsList = adminsList.filter(a => String(a.id) !== String(id));
                        localStorage.setItem('safemailzAdmins', JSON.stringify(adminsList));
                        if (String(selectedAdminId) === String(id)) {
                            selectedAdminId = null;
                            reloadSelectedAdminData();
                        }
                        renderAdmins();
                        
                        alert("Admin successfully deleted and reverted to employee status.");
                    } else {
                        const errData = await response.json().catch(()=>({}));
                        alert("Failed to demote admin: " + (errData.error || 'Unknown server error'));
                    }
                } catch (err) {
                    console.error("Error demoting admin:", err);
                    alert("Error connecting to server.");
                }
            }
        }
