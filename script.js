   
        // API Configuration
        const API_BASE = 'http://localhost:5000/api';
        
        let currentUser = null;
        let currentUserId = null;
        let currentUserType = null;
        let selectedCategory = null;
        let selectedImage = null;
        let currentAssignmentReportId = null;
        let currentCompletionReportId = null;
        let selectedCompletionImages = [];
        
        // LocalStorage fallback (for offline/UI sync)
        let allReports = JSON.parse(localStorage.getItem('jansamadhaan_reports') || '[]');
        let users = JSON.parse(localStorage.getItem('jansamadhaan_users') || '{}');

        // Officer data for different departments
        const departmentOfficers = {
            'Public Works': ['Aarav Sharma', 'Ananya Reddy', 'Michael Brown'],
            'Water Department': ['Priya Nair', 'Karthik Iyer', 'Sneha Kapoor'],
            'Sanitation Department': ['Aditya Verma', 'Pooja Singh', 'Neha Joshi'],
            'Electrical Department': ['Arjun Deshmukh', 'Kavya Menon', 'Suresh Patil'],
            'Roads & Transport': ['Meera Kulkarni', 'Manish Gupta', 'Aishwarya Rao'],
            'Environment Department': ['Vikram Choudhary', 'Daniel Lewis', 'Jessica Walker']
        };

        // Demo users for testing
        if (Object.keys(users).length === 0) {
            users = {
                citizens: {
                    '9876543210': { 
                        password: '123', 
                        name: 'Mahindra', 
                        phone: '9876543210',
                        reports: []
                    }
                },
                municipal: {
                    'MUN001': { 
                        password: '123', 
                        name: 'A R Likith', 
                        id: 'MUN001',
                        department: 'General Administration'
                    }
                }
            };
            localStorage.setItem('jansamadhaan_users', JSON.stringify(users));
        }

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateDashboardStats();
    renderLoginTicker();   // ← ADD THIS LINE
});

        function setupEventListeners() {
            // Login form submissions
            document.getElementById('citizenLoginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                loginCitizen();
            });

            document.getElementById('municipalLoginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                loginMunicipal();
            });

            // Category selection
            document.querySelectorAll('.category-card').forEach(card => {
                card.addEventListener('click', function() {
                    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedCategory = this.dataset.category;
                });
            });

            // Auto-fill contact phone for logged-in citizens
            if (currentUser && currentUserType === 'citizen') {
                document.getElementById('contactPhone').value = currentUser.phone;
            }

            // Department selection change handler
           
        }

        // Image preview function
        function previewImage(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    selectedImage = e.target.result;
                    document.getElementById('previewImg').src = e.target.result;
                    document.getElementById('imagePreview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }

        // Completion images preview function
        function previewCompletionImages(event) {
            const files = event.target.files;
            selectedCompletionImages = [];
            const previewContainer = document.getElementById('previewImagesContainer');
            previewContainer.innerHTML = '';

            if (files.length > 0) {
                document.getElementById('completionImagePreview').style.display = 'block';
                
                Array.from(files).forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        selectedCompletionImages.push(e.target.result);
                        
                        const imageDiv = document.createElement('div');
                        imageDiv.style.cssText = 'position: relative; display: inline-block;';
                        
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.style.cssText = 'max-width: 150px; max-height: 150px; border-radius: 8px; border: 2px solid #e0e0e0;';
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.textContent = '×';
                        removeBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;';
                        removeBtn.onclick = function() {
                            selectedCompletionImages.splice(index, 1);
                            imageDiv.remove();
                            if (selectedCompletionImages.length === 0) {
                                document.getElementById('completionImagePreview').style.display = 'none';
                            }
                        };
                        
                        imageDiv.appendChild(img);
                        imageDiv.appendChild(removeBtn);
                        previewContainer.appendChild(imageDiv);
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                document.getElementById('completionImagePreview').style.display = 'none';
            }
        }

        // Populate officers based on department selection
        function populateOfficers(department) {
            const officerSelect = document.getElementById('assignOfficer');
            officerSelect.innerHTML = '<option value="">Select Officer</option>';
            
            if (department && departmentOfficers[department]) {
                departmentOfficers[department].forEach(officer => {
                    const option = document.createElement('option');
                    option.value = officer;
                    option.textContent = officer;
                    officerSelect.appendChild(option);
                });
            }
        }

        // Login Functions
        function switchLoginTab(type) {
            document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(type + 'LoginForm').classList.add('active');
        }

        async function apiCall(endpoint, options = {}) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    ...options
                });
                return await response.json();
            } catch (err) {
                console.error('API Error:', err);
                return { success: false, error: 'Network error - using offline mode' };
            }
        }

        async function loginCitizen() {
            const username = document.getElementById('citizenPhone').value;
            const password = document.getElementById('citizenPassword').value;

            showNotification('Logging in...', 'info');

            // Try backend first
            const result = await apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (result.success) {
                currentUserId = result.userId;
                currentUserType = 'citizen';
                currentUser = { id: result.userId, username, name: username };
                
                document.getElementById('citizenName').textContent = result.username;
                document.getElementById('citizenAvatar').textContent = result.username.charAt(0);
                
                document.getElementById('loginContainer').classList.remove('active');
                document.getElementById('citizenApp').classList.add('active');
                
                loadUserReports(); // Load from backend
                showNotification('Login successful!');
                renderNotifPanel('citizen');
                return;
            }

            // Fallback to localStorage
            if (users.citizens[username] && users.citizens[username].password === password) {
                currentUser = users.citizens[username];
                currentUserType = 'citizen';
                showNotification('Offline login - Backend unavailable', 'warning');
                
                document.getElementById('citizenName').textContent = currentUser.name;
                document.getElementById('citizenAvatar').textContent = currentUser.name.charAt(0);
                
                document.getElementById('loginContainer').classList.remove('active');
                document.getElementById('citizenApp').classList.add('active');
                
                loadUserReports();
                renderNotifPanel('citizen');
            } else {
                showNotification('Invalid credentials', 'error');
            }
        }

        async function loginMunicipal() {
            const username = document.getElementById('municipalId').value;
            const password = document.getElementById('municipalPassword').value;

            showNotification('Logging in...', 'info');

            // Try backend first
            const result = await apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (result.success) {
                currentUserId = result.userId;
                currentUserType = 'municipal';
                currentUser = { id: result.userId, username, name: result.username };
                
                document.getElementById('municipalName').textContent = result.username;
                document.getElementById('municipalAvatar').textContent = result.username.charAt(0);
                
                document.getElementById('loginContainer').classList.remove('active');
                document.getElementById('municipalApp').classList.add('active');
                
                loadAllReports(); // Load from backend
                updateDashboardStats();
                showNotification('Admin login successful!');
                renderNotifPanel('municipal');
                return;
            }

            // Fallback
            if (users.municipal[username] && users.municipal[username].password === password) {
                currentUser = users.municipal[username];
                currentUserType = 'municipal';
                showNotification('Offline login - Backend unavailable', 'warning');
                
                document.getElementById('municipalName').textContent = currentUser.name;
                document.getElementById('municipalAvatar').textContent = currentUser.name.charAt(0);
                
                document.getElementById('loginContainer').classList.remove('active');
                document.getElementById('municipalApp').classList.add('active');
                
                loadAllReports();
                updateDashboardStats();
                renderNotifPanel('municipal');
            } else {
                showNotification('Invalid credentials', 'error');
            }
        }

        function logout() {
    currentUser = null;
    currentUserType = null;
    
    // Reset forms
    document.querySelectorAll('form').forEach(form => form.reset());
    
    // Switch back to login
    document.querySelectorAll('.app-container').forEach(container => {
        container.classList.remove('active');
    });
    document.getElementById('loginContainer').classList.add('active');
    
    showNotification('Logged out successfully');
    setTimeout(renderLoginTicker, 50);   // ← ADD THIS LINE
}

        async function showSignup(type) {
            if (type === 'citizen') {
                const username = prompt('Enter username (phone/email):');
                const password = prompt('Create password:');
                
                if (username && password) {
                    showNotification('Creating account...', 'info');
                    
                    const result = await apiCall('/register', {
                        method: 'POST',
                        body: JSON.stringify({ username, password })
                    });

                    if (result.success) {
                        showNotification(`Account created! userId: ${result.userId}`);
                    } else {
                        showNotification(result.error || 'Registration failed', 'error');
                        
                        // Fallback local
                        if (!users.citizens[username]) {
                            users.citizens[username] = { name: username, phone: username, password, reports: [] };
                            localStorage.setItem('jansamadhaan_users', JSON.stringify(users));
                            showNotification('Local account created (offline)');
                        }
                    }
                }
            }
        }

        // Navigation Functions
        function switchTab(tabName) {
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.dashboard-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            if (tabName === 'liveUpdatesCitizen') renderLiveUpdatesList('citizen');
        }

        function switchMunicipalTab(tabName) {
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.dashboard-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            if (tabName === 'liveUpdatesAdmin') renderLiveUpdatesList('admin');
        }

        // Report Functions
        function generateReportId() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `JSM-${year}${month}${day}-${random}`;
        }

        async function submitReport() {
            if (!selectedCategory) {
                showNotification('Please select a category', 'error');
                return;
            }

            const title = document.getElementById('issueTitle').value.trim();
            const description = document.getElementById('description').value.trim();
            const location = document.getElementById('location').value.trim();
            const priority = document.getElementById('priority').value;
            const contactPhone = document.getElementById('contactPhone').value.trim();

            if (!title || !description || !location || !currentUserId) {
                showNotification('Please fill all required fields & login first', 'error');
                return;
            }

            showNotification('Submitting report...', 'info');

            // Backend submit
            const result = await apiCall('/submit-report', {
                method: 'POST',
                body: JSON.stringify({
                    title, 
                    description, 
                    userId: currentUserId,
                    priority: priority || 'medium'
                })
            });

            if (result.success) {
                const reportId = `JSM-${result.insertId}`;
                showNotification(`✅ Report submitted! ID: ${reportId}`);
                addNotification('all', '📋', 'New Report Submitted', 
                    `New issue "${title}" (${priority.toUpperCase()}) at ${location}`);
                
                // Reset form
                document.getElementById('issueTitle').value = '';
                document.getElementById('priority').value = '';
                document.getElementById('description').value = '';
                document.getElementById('location').value = '';
                document.getElementById('issueImage').value = '';
                selectedCategory = null;
                selectedImage = null;
                document.getElementById('imagePreview').style.display = 'none';
                document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
                
                // Refresh reports
                loadUserReports();
                if (currentUserType === 'municipal') {
                    loadAllReports();
                    updateDashboardStats();
                }
                return;
            }

            // Fallback localStorage
            showNotification('Backend error, saved offline: ' + result.error, 'warning');
            const reportId = generateReportId();
            const report = {
                id: reportId,
                title, description, location,
                category: selectedCategory,
                priority: priority || 'medium',
                contactPhone: contactPhone || currentUser.phone,
                image: selectedImage,
                status: 'submitted',
                submittedBy: currentUser.name,
                submittedPhone: currentUser.phone,
                submittedAt: new Date().toISOString()
            };
            allReports.push(report);
            if (!currentUser.reports) currentUser.reports = [];
            currentUser.reports.push(reportId);
            
            users.citizens[currentUser.phone] = currentUser;
            localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));
            localStorage.setItem('jansamadhaan_users', JSON.stringify(users));

            // Reset form
            document.getElementById('issueTitle').value = '';
            document.getElementById('priority').value = '';
            document.getElementById('description').value = '';
            document.getElementById('location').value = '';
            document.getElementById('issueImage').value = '';
            selectedCategory = null;
            selectedImage = null;
            document.getElementById('imagePreview').style.display = 'none';
            document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));

            showNotification(`Offline report saved! ID: ${reportId}`);
            addNotification('all', '📋', 'New Report Submitted (Offline)',
                `${currentUser.name} reported: "${title}" (${priority.toUpperCase()})`);
            loadUserReports();
        }

        function trackReportStatus() {
            const trackingId = document.getElementById('trackingId').value.trim().toUpperCase();
            
            if (!trackingId) {
                showNotification('Please enter a tracking ID', 'error');
                return;
            }

            const report = allReports.find(r => r.id === trackingId);
            
            if (!report) {
                showNotification('Report not found. Please check your tracking ID.', 'error');
                document.getElementById('trackResult').style.display = 'none';
                return;
            }

            // Show report info
            document.getElementById('reportInfo').innerHTML = `
                <h3>${report.title}</h3>
                <p><strong>Category:</strong> ${getCategoryName(report.category)}</p>
                <p><strong>Priority:</strong> <span class="priority-badge priority-${report.priority}">${report.priority.toUpperCase()}</span></p>
                <p><strong>Location:</strong> ${report.location}</p>
                <p><strong>Submitted:</strong> ${new Date(report.submittedAt).toLocaleString()}</p>
            `;

            // Update status timeline
            updateStatusTimeline(report.status);

            // Show status details
            const statusMessages = {
                'submitted': 'Your report has been submitted and is awaiting assignment.',
                'assigned': `Your report has been assigned to ${report.assignedTo || 'a department'}.`,
                'progress': 'Work is in progress on your report.',
                'completed': 'Your report has been completed and resolved.'
            };

            document.getElementById('statusDetails').innerHTML = `
                <p><strong>Current Status:</strong> <span class="status-badge status-${report.status}">${report.status.toUpperCase()}</span></p>
                <p>${statusMessages[report.status]}</p>
            `;

            // Show completion details if report is completed
            displayCompletionDetails(report, 'completionDetails');

            document.getElementById('trackResult').style.display = 'block';
        }

        function displayCompletionDetails(report, containerId) {
            const container = document.getElementById(containerId);
            
            if (report.status === 'completed' && report.workDescription) {
                let completionImagesHtml = '';
                if (report.completionImages && report.completionImages.length > 0) {
                    completionImagesHtml = `
                        <div class="completion-item">
                            <strong>Completion Photos:</strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                                ${report.completionImages.map(img => 
                                    `<img src="${img}" alt="Completed Work" style="max-width: 150px; height: auto; border-radius: 8px; border: 2px solid #27ae60; cursor: pointer;" onclick="window.open('${img}', '_blank')">`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }

                container.innerHTML = `
                    <div class="completion-section">
                        <h4>Work Completion Details</h4>
                        <div class="completion-grid">
                            <div class="completion-item">
                                <strong>Work Description:</strong>
                                ${report.workDescription}
                            </div>
                            <div class="completion-item">
                                <strong>Completed By:</strong>
                                ${report.completedBy}
                            </div>
                            <div class="completion-item">
                                <strong>Completion Date:</strong>
                                ${new Date(report.completedAt).toLocaleDateString()}
                            </div>
                            ${report.materialsUsed ? `
                                <div class="completion-item">
                                    <strong>Materials Used:</strong>
                                    ${report.materialsUsed}
                                </div>
                            ` : ''}
                            ${report.costIncurred > 0 ? `
                                <div class="completion-item">
                                    <strong>Cost Incurred:</strong>
                                    ₹${report.costIncurred.toFixed(2)}
                                </div>
                            ` : ''}
                            ${report.additionalNotes ? `
                                <div class="completion-item">
                                    <strong>Additional Notes:</strong>
                                    ${report.additionalNotes}
                                </div>
                            ` : ''}
                        </div>
                        ${completionImagesHtml}
                    </div>
                `;
            } else {
                container.innerHTML = '';
            }
        }

        function updateStatusTimeline(currentStatus) {
            const steps = document.querySelectorAll('.status-step');
            const statusOrder = ['submitted', 'assigned', 'progress', 'completed'];
            const currentIndex = statusOrder.indexOf(currentStatus);

            steps.forEach((step, index) => {
                step.classList.remove('completed', 'current');
                if (index < currentIndex) {
                    step.classList.add('completed');
                } else if (index === currentIndex) {
                    step.classList.add('current');
                }
            });
        }

        async function loadUserReports() {
            showNotification('Loading reports...', 'info');
            
            let userReports;
            if (currentUserId) {
                // Backend first
                const result = await apiCall(`/user-reports/${currentUserId}`);
                if (result.success && result.reports.length > 0) {
                    userReports = result.reports.map(r => ({
                        id: `JSM-${r.id}`,
                        title: r.title,
                        status: r.status,
                        submitted_time: r.submitted_time,
                        category: 'other'
                    }));
                    allReports = [...userReports, ...allReports.filter(r => !r.id.startsWith('JSM-'))];
                    localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));
                    showNotification(`${userReports.length} reports loaded from server`);
                } else {
                    userReports = [];
                }
            }
            
            if (!userReports || userReports.length === 0) {
                userReports = allReports.filter(r => r.submitted_by === currentUserId);
                document.getElementById('userReportsList').innerHTML = 
                    '<p style="text-align: center; color: #666; padding: 40px;">No reports submitted yet.</p>';
                return;
            }

            let html = '<table class="reports-table"><thead><tr>';
            html += '<th>Report ID</th><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th>';
            html += '</tr></thead><tbody>';

            userReports.forEach(report => {
                html += `<tr>
                    <td>${report.id}</td>
                    <td>${report.title}</td>
                    <td>${getCategoryName(report.category)}</td>
                    <td><span class="status-badge status-${report.status}">${report.status.toUpperCase()}</span></td>
                    <td>${new Date(report.submitted_time || report.submittedAt).toLocaleDateString()}</td>
                    <td><button class="action-btn btn-assign" onclick="viewCitizenReportDetails('${report.id}')">View Details</button></td>
                </tr>`;
            });

            html += '</tbody></table>';
            document.getElementById('userReportsList').innerHTML = html;
        }

        // Municipal Functions
        async function loadAllReports() {
            showNotification('Loading reports...', 'info');
            
            // Backend first (municipal only)
            if (currentUserId && currentUserType === 'municipal') {
                const result = await apiCall('/reports');
                if (result.success && result.reports.length > 0) {
                    allReports = result.reports.map(r => ({
                        id: `JSM-${r.id}`,
                        title: r.title,
                        category: 'other',
                        priority: r.priority || 'medium',
                        status: r.status,
                        submittedBy: r.submitted_by,
                        submittedAt: r.submitted_time,
                        submitted_time: r.submitted_time
                    }));
                    localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));
                    showNotification(`${allReports.length} reports loaded from server`);
                }
            }

            const recentTable = document.getElementById('recentReportsTable');
            const allTable = document.getElementById('allReportsTable');

            if (allReports.length === 0) {
                recentTable.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No reports available</td></tr>';
                allTable.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No reports available</td></tr>';
                return;
            }

            // Recent reports (last 10)
            const recentReports = allReports.slice(-10).reverse();
            recentTable.innerHTML = recentReports.map(report => `
                <tr>
                    <td>${report.id}</td>
                    <td>${report.title}</td>
                    <td>${getCategoryName(report.category)}</td>
                    <td><span class="priority-badge priority-${report.priority}">${report.priority.toUpperCase()}</span></td>
                    <td><span class="status-badge status-${report.status}">${report.status.toUpperCase()}</span></td>
                    <td>${new Date(report.submittedAt || report.submitted_time).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn btn-assign" onclick="assignOfficer('${report.id}', '${report.officer_assigned || ''}')">Assign Officer</button>
                        <button class="action-btn" onclick="updateStatus(${report.id}, '${report.status}')">Update Status</button>
                    </td>
                </tr>
            `).join('');

            // All reports
            allTable.innerHTML = allReports.slice().reverse().map(report => `
                <tr>
                    <td>${report.id}</td>
                    <td>${report.title}</td>
                    <td>${getCategoryName(report.category)}</td>
                    <td><span class="priority-badge priority-${report.priority}">${report.priority.toUpperCase()}</span></td>
                    <td><span class="status-badge status-${report.status}">${report.status.toUpperCase()}</span></td>
                    <td>${report.submittedBy || report.submitted_by}</td>
                    <td>${new Date(report.submittedAt || report.submitted_time).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn btn-assign" onclick="assignOfficer('${report.id}', '${report.officer_assigned || ''}')">Assign Officer</button>
                        <button class="action-btn" onclick="updateStatus(${report.id}, '${report.status}')">Update Status</button>
                    </td>
                </tr>
            `).join('');
        }

function getMunicipalActions(report) {
            return `
                <button class="action-btn btn-assign" onclick="assignOfficer('${report.id}', '${report.officer_assigned || ''}')">Assign Officer</button>
                <button class="action-btn" onclick="updateStatus(${report.id}, '${report.status}')">Update Status</button>
            `;
        }

// Enhanced department-wise officers dropdown + status with percentage
const ALL_OFFICERS = [
    { dept: 'Public Works', name: 'Aarav Sharma (Roads)', deptShort: 'PW' },
    { dept: 'Public Works', name: 'Ananya Reddy (Drainage)', deptShort: 'PW' },
    { dept: 'Water Supply', name: 'Priya Nair (Water)', deptShort: 'WS' },
    { dept: 'Water Supply', name: 'Karthik Iyer (Pipes)', deptShort: 'WS' },
    { dept: 'Sanitation', name: 'Aditya Verma (Waste)', deptShort: 'SAN' },
    { dept: 'Sanitation', name: 'Pooja Singh (Cleaning)', deptShort: 'SAN' },
    { dept: 'Electricity', name: 'Arjun Deshmukh (Lights)', deptShort: 'ELEC' },
    { dept: 'Electricity', name: 'Kavya Menon (Power)', deptShort: 'ELEC' },
    { dept: 'Roads & Transport', name: 'Meera Kulkarni (Transport)', deptShort: 'RT' },
    { dept: 'Roads & Transport', name: 'Manish Gupta (Roads)', deptShort: 'RT' }
];

function assignOfficer(reportId, currentOfficer) {
    const officer = prompt(
        `Assign officer to ${reportId}:\n\n` +
        ALL_OFFICERS.map(o => o.name).join('\n'),
        currentOfficer || ''
    );

    if (!officer) return;

    // ✅ Convert JSM-123 → 123
    const numericId = reportId.replace('JSM-', '');

    fetch(`${API_BASE}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reportId: numericId,
            officer: officer
        })
    })
    .then(res => res.text())
    .then(msg => {
        alert('✅ Assigned successfully');

        // ✅ Update local data
        const report = allReports.find(r => r.id === reportId);
        if (report) {
            report.status = 'assigned';
            report.assignedTo = officer;
        }

        localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));

        loadAllReports();
        updateDashboardStats();
    })
    .catch(err => {
        console.error(err);
        alert('❌ Assignment failed');
    });
}

function updateStatus(reportId, currentStatus) {
    const statusOptions = {
        'pending': '0%',
        'assigned': '25%',
        'progress': '75%',
        'completed': '100%'
    };
    let options = Object.keys(statusOptions).map(s => `${s} (${statusOptions[s]})`).join('\\n');
    const newStatus = prompt(`Update status for report ${reportId} (${currentStatus}):\n${options}`, currentStatus);
    if (newStatus && ['pending','assigned','progress','completed'].includes(newStatus)) {
        fetch(`${API_BASE}/status`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reportId, status: newStatus})
        }).then(res => res.text()).then(msg => {
            alert('✅ ' + msg + ` (${statusOptions[newStatus]})`);
            loadAllReports();
        }).catch(err => alert('Error: ' + err));
    }
}

        function assignReport(reportId) {
            currentAssignmentReportId = reportId;
            const report = allReports.find(r => r.id === reportId);
            
            if (report) {
                // Pre-fill current priority
                document.getElementById('assignPriority').value = report.priority;
                
                // Set minimum date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('expectedCompletion').min = today;
                
                // Show the assignment modal
                document.getElementById('assignmentModal').style.display = 'block';
            }
        }

        function closeAssignmentModal() {
            document.getElementById('assignmentModal').style.display = 'none';
            currentAssignmentReportId = null;
            document.getElementById('reportAssignmentForm').reset();
        }

        function confirmAssignment() {
            const department = document.getElementById('assignDepartment').value;
            const officer = document.getElementById('assignOfficer').value;
            const priority = document.getElementById('assignPriority').value;
            const expectedDate = document.getElementById('expectedCompletion').value;
            const notes = document.getElementById('assignmentNotes').value;

            if (!department || !officer || !expectedDate) {
                showNotification('Please fill all required fields', 'error');
                return;
            }

            const reportIndex = allReports.findIndex(r => r.id === currentAssignmentReportId);
            if (reportIndex !== -1) {
                allReports[reportIndex].status = 'assigned';
                allReports[reportIndex].assignedTo = officer;
                allReports[reportIndex].assignedDepartment = department;
                allReports[reportIndex].priority = priority;
                allReports[reportIndex].expectedCompletion = expectedDate;
                allReports[reportIndex].assignmentNotes = notes;
                allReports[reportIndex].assignedAt = new Date().toISOString();
                allReports[reportIndex].assignedBy = currentUser.name;
                
                localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));
                loadAllReports();
                updateDashboardStats();
                
                showNotification(`Report ${currentAssignmentReportId} assigned to ${officer} (${department})`);
                showNotification(`Report ${currentAssignmentReportId} assigned to ${officer} (${department})`);
// ← ADD THESE 4 LINES
const assignedReport = allReports[reportIndex];
addNotification('all', '👤', 'Officer Assigned',
    `Report "${assignedReport.title}" (ID: ${currentAssignmentReportId}) assigned to ${officer} from ${department}. Expected: ${new Date(expectedDate).toLocaleDateString()}.`);
                closeAssignmentModal();
            }
        }

        function startProgress(reportId) {
            const reportIndex = allReports.findIndex(r => r.id === reportId);
            if (reportIndex !== -1) {
                allReports[reportIndex].status = 'progress';
                
                localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));
                loadAllReports();
                updateDashboardStats();
                
                showNotification(`Work started on report ${reportId}`);
// ← ADD THESE 3 LINES
const progressRep = allReports[reportIndex];
addNotification('all', '🔄', 'Work Started',
    `Work has begun on report "${progressRep.title}" (ID: ${reportId}) assigned to ${progressRep.assignedTo || 'the team'}.`);
            }
        }

        function completeReport(reportId) {
            currentCompletionReportId = reportId;
            const report = allReports.find(r => r.id === reportId);
            
            if (report) {
                // Set default completion date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('completionDate').value = today;
                document.getElementById('completionDate').max = today;
                
                // Pre-fill completed by field with current user
                document.getElementById('completedBy').value = currentUser.name;
                
                // Show the completion modal
                document.getElementById('completionModal').style.display = 'block';
            }
        }

        function closeCompletionModal() {
            document.getElementById('completionModal').style.display = 'none';
            currentCompletionReportId = null;
            selectedCompletionImages = [];
            document.getElementById('reportCompletionForm').reset();
            document.getElementById('completionImagePreview').style.display = 'none';
            document.getElementById('previewImagesContainer').innerHTML = '';
        }

        function confirmCompletion() {
            const workDescription = document.getElementById('workDescription').value.trim();
            const completionDate = document.getElementById('completionDate').value;
            const completedBy = document.getElementById('completedBy').value.trim();
            const materialsUsed = document.getElementById('materialsUsed').value.trim();
            const costIncurred = document.getElementById('costIncurred').value;
            const additionalNotes = document.getElementById('additionalNotes').value.trim();

            if (!workDescription || !completionDate || !completedBy) {
                showNotification('Please fill all required fields', 'error');
                return;
            }

            const reportIndex = allReports.findIndex(r => r.id === currentCompletionReportId);
            if (reportIndex !== -1) {
                allReports[reportIndex].status = 'completed';
                allReports[reportIndex].completedAt = new Date(completionDate).toISOString();
                allReports[reportIndex].workDescription = workDescription;
                allReports[reportIndex].completedBy = completedBy;
                allReports[reportIndex].materialsUsed = materialsUsed;
                allReports[reportIndex].costIncurred = costIncurred ? parseFloat(costIncurred) : 0;
                allReports[reportIndex].additionalNotes = additionalNotes;
                allReports[reportIndex].completionImages = selectedCompletionImages;
                allReports[reportIndex].completionProcessedBy = currentUser.name;
                allReports[reportIndex].completionProcessedAt = new Date().toISOString();
                
                localStorage.setItem('jansamadhaan_reports', JSON.stringify(allReports));
                loadAllReports();
                updateDashboardStats();
                
                showNotification(`Report ${currentCompletionReportId} marked as completed successfully`);
// ← ADD THESE 3 LINES
const completedRep = allReports[reportIndex];
addNotification('all', '✅', 'Issue Resolved',
    `Report "${completedRep.title}" (ID: ${currentCompletionReportId}) has been successfully resolved by ${completedBy}.`);
                closeCompletionModal();
            }
        }

        function updateDashboardStats() {
            const pending = allReports.filter(r => r.status === 'submitted').length;
            const progress = allReports.filter(r => r.status === 'assigned' || r.status === 'progress').length;
            const completed = allReports.filter(r => r.status === 'completed').length;
            const critical = allReports.filter(r => r.priority === 'critical').length;

            document.getElementById('pendingCount').textContent = pending;
            document.getElementById('progressCount').textContent = progress;
            document.getElementById('completedCount').textContent = completed;
            document.getElementById('criticalCount').textContent = critical;
            document.getElementById('totalReports').textContent = allReports.length;

            // Calculate average resolution time
            const completedReports = allReports.filter(r => r.status === 'completed' && r.completedAt);
            let avgDays = 0;
            if (completedReports.length > 0) {
                const totalDays = completedReports.reduce((sum, report) => {
                    const submitted = new Date(report.submittedAt);
                    const completed = new Date(report.completedAt);
                    const days = Math.ceil((completed - submitted) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }, 0);
                avgDays = Math.round(totalDays / completedReports.length);
            }
            document.getElementById('avgResolutionTime').textContent = avgDays;
        }

        // Utility Functions
        function getCategoryName(category) {
            const names = {
                'road': 'Road & Traffic',
                'water': 'Water Supply',
                'waste': 'Waste Management',
                'electricity': 'Electricity',
                'drainage': 'Drainage',
                'sanitation': 'Sanitation',
                'parks': 'Parks & Recreation',
                'streetlight': 'Street Lighting',
                'noise': 'Noise Pollution',
                'air': 'Air Pollution',
                'building': 'Building Violations',
                'animal': 'Stray Animals',
                'public': 'Public Facilities',
                'health': 'Public Health',
                'security': 'Public Safety',
                'other': 'Other Issues'
            };
            return names[category] || category;
        }

        // Enhanced view function for citizens to see completion details
        function viewCitizenReportDetails(reportId) {
            const report = allReports.find(r => r.id === reportId);
            if (!report) return;

            let imageSection = '';
            if (report.image) {
                imageSection = `<p><strong>Attached Image:</strong></p>
                               <img src="${report.image}" alt="Report Image" style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #e0e0e0; margin: 10px 0;">`;
            }

            let assignmentDetails = '';
            if (report.status !== 'submitted') {
                assignmentDetails = `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h4>Assignment Details</h4>
                        ${report.assignedTo ? `<p><strong>Assigned to:</strong> ${report.assignedTo}</p>` : ''}
                        ${report.assignedDepartment ? `<p><strong>Department:</strong> ${report.assignedDepartment}</p>` : ''}
                        ${report.expectedCompletion ? `<p><strong>Expected Completion:</strong> ${new Date(report.expectedCompletion).toLocaleDateString()}</p>` : ''}
                        ${report.assignedAt ? `<p><strong>Assigned on:</strong> ${new Date(report.assignedAt).toLocaleString()}</p>` : ''}
                    </div>
                `;
            }

            let completionDetailsHtml = '';
            if (report.status === 'completed') {
                let completionImagesSection = '';
                if (report.completionImages && report.completionImages.length > 0) {
                    completionImagesSection = `
                        <div style="margin: 15px 0;">
                            <p><strong>Work Completion Photos:</strong></p>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                ${report.completionImages.map(img => 
                                    `<img src="${img}" alt="Completed Work" style="max-width: 200px; height: auto; border-radius: 8px; border: 2px solid #27ae60; cursor: pointer;" onclick="window.open('${img}', '_blank')">`
                                ).join('')}
                            </div>
                            <p style="font-size: 0.9rem; color: #666; margin-top: 5px;">Click on images to view in full size</p>
                        </div>
                    `;
                }

                completionDetailsHtml = `
                    <div class="completion-section">
                        <h4>Work Completion Details</h4>
                        <div class="completion-grid">
                            <div class="completion-item">
                                <strong>Work Description:</strong>
                                ${report.workDescription}
                            </div>
                            <div class="completion-item">
                                <strong>Completed by:</strong>
                                ${report.completedBy}
                            </div>
                            <div class="completion-item">
                                <strong>Completion Date:</strong>
                                ${new Date(report.completedAt).toLocaleDateString()}
                            </div>
                            ${report.materialsUsed ? `
                                <div class="completion-item">
                                    <strong>Materials Used:</strong>
                                    ${report.materialsUsed}
                                </div>
                            ` : ''}
                            ${report.costIncurred && report.costIncurred > 0 ? `
                                <div class="completion-item">
                                    <strong>Cost Incurred:</strong>
                                    ₹${report.costIncurred.toFixed(2)}
                                </div>
                            ` : ''}
                            ${report.additionalNotes ? `
                                <div class="completion-item">
                                    <strong>Additional Notes:</strong>
                                    ${report.additionalNotes}
                                </div>
                            ` : ''}
                        </div>
                        ${completionImagesSection}
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(21, 87, 36, 0.2);">
                            <p style="font-size: 0.9rem; color: #155724;"><strong>Resolution completed successfully!</strong> Thank you for using JanSamadhaan.</p>
                        </div>
                    </div>
                `;
            }

            const modalContent = `
                <h3>${report.title}</h3>
                <p><strong>Report ID:</strong> ${report.id}</p>
                <p><strong>Category:</strong> ${getCategoryName(report.category)}</p>
                <p><strong>Priority:</strong> <span class="priority-badge priority-${report.priority}">${report.priority.toUpperCase()}</span></p>
                <p><strong>Status:</strong> <span class="status-badge status-${report.status}">${report.status.toUpperCase()}</span></p>
                <p><strong>Description:</strong> ${report.description}</p>
                <p><strong>Location:</strong> ${report.location}</p>
                <p><strong>Contact:</strong> ${report.contactPhone}</p>
                <p><strong>Submitted on:</strong> ${new Date(report.submittedAt).toLocaleString()}</p>
                ${imageSection}
                ${assignmentDetails}
                ${completionDetailsHtml}
            `;

            document.getElementById('modalContent').innerHTML = modalContent;
            document.getElementById('reportModal').style.display = 'block';
        }

        function viewReportDetails(reportId) {
            const report = allReports.find(r => r.id === reportId);
            if (!report) return;

            let imageSection = '';
            if (report.image) {
                imageSection = `<p><strong>Attached Image:</strong></p>
                               <img src="${report.image}" alt="Report Image" style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #e0e0e0; margin: 10px 0;">`;
            }

            let assignmentDetails = '';
            if (report.status !== 'submitted') {
                assignmentDetails = `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h4>Assignment Details</h4>
                        ${report.assignedTo ? `<p><strong>Assigned to:</strong> ${report.assignedTo}</p>` : ''}
                        ${report.assignedDepartment ? `<p><strong>Department:</strong> ${report.assignedDepartment}</p>` : ''}
                        ${report.expectedCompletion ? `<p><strong>Expected Completion:</strong> ${new Date(report.expectedCompletion).toLocaleDateString()}</p>` : ''}
                        ${report.assignmentNotes ? `<p><strong>Notes:</strong> ${report.assignmentNotes}</p>` : ''}
                        ${report.assignedBy ? `<p><strong>Assigned by:</strong> ${report.assignedBy}</p>` : ''}
                        ${report.assignedAt ? `<p><strong>Assigned on:</strong> ${new Date(report.assignedAt).toLocaleString()}</p>` : ''}
                    </div>
                `;
            }

            let completionDetails = '';
            if (report.status === 'completed') {
                let completionImagesSection = '';
                if (report.completionImages && report.completionImages.length > 0) {
                    completionImagesSection = `
                        <div style="margin: 15px 0;">
                            <p><strong>Completion Images:</strong></p>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                ${report.completionImages.map(img => 
                                    `<img src="${img}" alt="Completion Image" style="max-width: 200px; height: auto; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer;" onclick="window.open('${img}', '_blank')">`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }

                completionDetails = `
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #27ae60;">
                        <h4>Completion Details</h4>
                        ${report.workDescription ? `<p><strong>Work Completed:</strong> ${report.workDescription}</p>` : ''}
                        ${report.completedBy ? `<p><strong>Completed by:</strong> ${report.completedBy}</p>` : ''}
                        ${report.completedAt ? `<p><strong>Completion Date:</strong> ${new Date(report.completedAt).toLocaleDateString()}</p>` : ''}
                        ${report.materialsUsed ? `<p><strong>Materials Used:</strong> ${report.materialsUsed}</p>` : ''}
                        ${report.costIncurred ? `<p><strong>Cost Incurred:</strong> ₹${report.costIncurred.toFixed(2)}</p>` : ''}
                        ${report.additionalNotes ? `<p><strong>Additional Notes:</strong> ${report.additionalNotes}</p>` : ''}
                        ${completionImagesSection}
                        ${report.completionProcessedBy ? `<p><strong>Processed by:</strong> ${report.completionProcessedBy}</p>` : ''}
                        ${report.completionProcessedAt ? `<p><strong>Processed on:</strong> ${new Date(report.completionProcessedAt).toLocaleString()}</p>` : ''}
                    </div>
                `;
            }

            const modalContent = `
                <h3>${report.title}</h3>
                <p><strong>Report ID:</strong> ${report.id}</p>
                <p><strong>Category:</strong> ${getCategoryName(report.category)}</p>
                <p><strong>Priority:</strong> <span class="priority-badge priority-${report.priority}">${report.priority.toUpperCase()}</span></p>
                <p><strong>Status:</strong> <span class="status-badge status-${report.status}">${report.status.toUpperCase()}</span></p>
                <p><strong>Description:</strong> ${report.description}</p>
                <p><strong>Location:</strong> ${report.location}</p>
                <p><strong>Contact:</strong> ${report.contactPhone}</p>
                <p><strong>Submitted by:</strong> ${report.submittedBy}</p>
                <p><strong>Submitted on:</strong> ${new Date(report.submittedAt).toLocaleString()}</p>
                ${imageSection}
                ${assignmentDetails}
                ${completionDetails}
            `;

            document.getElementById('modalContent').innerHTML = modalContent;
            document.getElementById('reportModal').style.display = 'block';
        }

        function closeModal() {
            document.getElementById('reportModal').style.display = 'none';
        }

        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';

            setTimeout(() => {
                notification.style.display = 'none';
            }, 4000);
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const reportModal = document.getElementById('reportModal');
            const assignmentModal = document.getElementById('assignmentModal');
            const completionModal = document.getElementById('completionModal');
            
            if (event.target === reportModal) {
                reportModal.style.display = 'none';
            }
            if (event.target === assignmentModal) {
                closeAssignmentModal();
            }
            if (event.target === completionModal) {
                closeCompletionModal();
            }
        }
            // ===== NOTIFICATION BAR SYSTEM =====
const GLOBAL_NOTIF_KEY = 'jansamadhaan_notif_global';

function loadNotifications() {
    return JSON.parse(localStorage.getItem(GLOBAL_NOTIF_KEY) || '[]');
}

function saveNotifications(notifications) {
    localStorage.setItem(GLOBAL_NOTIF_KEY, JSON.stringify(notifications));
}

function addNotification(role, icon, title, message) {
    const notifications = loadNotifications();
    notifications.unshift({
        id: Date.now(),
        icon,
        title,
        message,
        time: new Date().toISOString(),
        unread: true
    });
    if (notifications.length > 100) notifications.splice(100);
    saveNotifications(notifications);

    if (currentUserType === 'municipal') renderNotifPanel('municipal');
    if (currentUserType === 'citizen')   renderNotifPanel('citizen');
}

function renderNotifPanel(role) {
    const notifications = loadNotifications();
    const listEl  = document.getElementById(role === 'municipal' ? 'municipalNotifList'  : 'citizenNotifList');
    const countEl = document.getElementById(role === 'municipal' ? 'municipalNotifCount' : 'citizenNotifCount');

    if (!listEl || !countEl) return;

    const readKey = 'jansamadhaan_notif_readts_' + role;
    const lastReadTs = parseInt(localStorage.getItem(readKey) || '0');
    const unread = notifications.filter(n => new Date(n.time).getTime() > lastReadTs).length;

    if (unread > 0) {
        countEl.textContent = unread > 99 ? '99+' : unread;
        countEl.style.display = 'flex';
    } else {
        countEl.style.display = 'none';
    }

    if (notifications.length === 0) {
        listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
        return;
    }

    listEl.innerHTML = notifications.map(n => {
        const isUnread = new Date(n.time).getTime() > lastReadTs;
        return `
        <div class="notif-item ${isUnread ? 'unread' : ''}">
            <div class="notif-icon">${n.icon}</div>
            <div class="notif-body">
                <div class="notif-title">${n.title}</div>
                <div class="notif-msg">${n.message}</div>
                <div class="notif-time">${formatNotifTime(n.time)}</div>
            </div>
            ${isUnread ? '<div class="notif-dot"></div>' : ''}
        </div>`;
    }).join('');
}

function formatNotifTime(isoString) {
    const date = new Date(isoString);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

function toggleNotifPanel(role) {
    const panelId = role === 'municipal' ? 'municipalNotifPanel' : 'citizenNotifPanel';
    const panel   = document.getElementById(panelId);
    const isOpen  = panel.classList.contains('open');

    document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('open'));

    if (!isOpen) {
        panel.classList.add('open');
        markAllRead(role);
    }
}

function markAllRead(role) {
    const readKey = 'jansamadhaan_notif_readts_' + role;
    localStorage.setItem(readKey, Date.now().toString());
    renderNotifPanel(role);
}

function clearNotifications(role) {
    saveNotifications([]);
    localStorage.removeItem('jansamadhaan_notif_readts_municipal');
    localStorage.removeItem('jansamadhaan_notif_readts_citizen');
    renderNotifPanel(role);
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.notif-bell-wrapper')) {
        document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('open'));
    }
});
// ===== LOGIN PAGE TICKER BAR =====
function renderLoginTicker() {
    const track = document.getElementById('loginTickerTrack');
    if (!track) return;

    const manualUpdates = loadLiveUpdates();
    const autoNotifs    = loadNotifications();

    let items = [];

    manualUpdates.forEach(u => {
        items.push(`<span class="login-ticker-item">
            <span class="t-icon">${u.icon}</span>
            <strong>${u.title}:</strong>&nbsp;${u.msg}
            <span class="t-time">&nbsp;— ${u.postedBy} &bull; ${formatNotifTime(u.time)}</span>
        </span>`);
    });

    autoNotifs.slice(0, 15).forEach(n => {
        items.push(`<span class="login-ticker-item">
            <span class="t-icon">${n.icon}</span>
            <strong>${n.title}:</strong>&nbsp;${n.message}
            <span class="t-time">${formatNotifTime(n.time)}</span>
        </span>`);
    });

    if (items.length === 0) {
        track.innerHTML = `<span class="login-ticker-item"><span class="t-icon">🏛️</span> Welcome to JanSamadhaan – Smart City Civic Platform. Report civic issues and track resolutions in real time.</span>`;
    } else {
        const html = items.join('');
        track.innerHTML = html + html;
    }

    track.style.animation = 'none';
    track.offsetHeight;
    track.style.animation = '';
}

// ===== LIVE UPDATES (Manual Announcements) =====
const LIVE_UPDATES_KEY = 'jansamadhaan_live_updates';

function loadLiveUpdates() {
    return JSON.parse(localStorage.getItem(LIVE_UPDATES_KEY) || '[]');
}

function saveLiveUpdates(updates) {
    localStorage.setItem(LIVE_UPDATES_KEY, JSON.stringify(updates));
}

function postLiveUpdate(who) {
    const isAdmin = who === 'admin';
    const icon  = document.getElementById(isAdmin ? 'adminUpdateIcon'  : 'citizenUpdateIcon').value;
    const title = document.getElementById(isAdmin ? 'adminUpdateTitle' : 'citizenUpdateTitle').value.trim();
    const msg   = document.getElementById(isAdmin ? 'adminUpdateMsg'   : 'citizenUpdateMsg').value.trim();

    if (!title || !msg) {
        showNotification('Please fill in both Title and Message', 'error');
        return;
    }

    const updates = loadLiveUpdates();
    updates.unshift({
        id: Date.now(),
        icon,
        title,
        msg,
        postedBy: currentUser ? currentUser.name : 'User',
        role: isAdmin ? 'admin' : 'citizen',
        time: new Date().toISOString()
    });
    if (updates.length > 50) updates.splice(50);
    saveLiveUpdates(updates);

    document.getElementById(isAdmin ? 'adminUpdateTitle' : 'citizenUpdateTitle').value = '';
    document.getElementById(isAdmin ? 'adminUpdateMsg'   : 'citizenUpdateMsg').value   = '';

    renderLiveUpdatesList('citizen');
    renderLiveUpdatesList('admin');
    renderLoginTicker();
    showNotification('✅ Update posted to Live Ticker!');
}

function deleteLiveUpdate(id) {
    let updates = loadLiveUpdates();
    updates = updates.filter(u => u.id !== id);
    saveLiveUpdates(updates);
    renderLiveUpdatesList('citizen');
    renderLiveUpdatesList('admin');
    renderLoginTicker();
    showNotification('Update removed from ticker');
}

function clearAllLiveUpdates() {
    if (!confirm('Clear all live updates from the ticker?')) return;
    saveLiveUpdates([]);
    renderLiveUpdatesList('citizen');
    renderLiveUpdatesList('admin');
    renderLoginTicker();
    showNotification('All live updates cleared');
}

function renderLiveUpdatesList(who) {
    const listId = who === 'admin' ? 'liveUpdatesAdminList' : 'liveUpdatesCitizenList';
    const el = document.getElementById(listId);
    if (!el) return;

    const updates = loadLiveUpdates();
    if (updates.length === 0) {
        el.innerHTML = '<div class="live-updates-empty">No updates posted yet. Use the form above to post one!</div>';
        return;
    }

    el.innerHTML = updates.map(u => `
        <div class="live-update-card ${u.role === 'admin' ? 'admin-card' : ''}">
            <div class="live-update-icon">${u.icon}</div>
            <div class="live-update-body">
                <div class="live-update-title">${u.title}</div>
                <div class="live-update-msg">${u.msg}</div>
                <div class="live-update-meta">
                    <span class="live-update-by ${u.role === 'admin' ? 'admin-badge' : ''}">
                        ${u.role === 'admin' ? '🏛️ Admin' : '👤 Citizen'}: ${u.postedBy}
                    </span>
                    <span class="live-update-time">${formatNotifTime(u.time)}</span>
                </div>
            </div>
            <button class="live-update-delete" onclick="deleteLiveUpdate(${u.id})" title="Remove">✕</button>
        </div>
    `).join('');
}
// Test backend APIs ready - remove after testing
console.log('🚀 JanSamadhaan Frontend + Backend Ready!');
console.log('📱 Login/Register → MySQL users table');
console.log('📋 Submit Report → MySQL reports table');
console.log('👤 Municipal dashboard loads all reports');
console.log('💾 localStorage fallback enabled');        


        
